"use client";

import { useEffect, useMemo, useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import {
  FileText,
  PawPrint,
  Clock,
  Camera,
  Mail,
  Send,
  Plus,
  Eye,
  Check,
  Sparkles,
  CalendarClock,
} from "lucide-react";
import { daycareCheckIns } from "@/data/daycare";
import { boardingGuests } from "@/data/boarding";
import { useSettings } from "@/hooks/use-settings";
import type { ReportCardTheme } from "@/lib/types";
import { cn } from "@/lib/utils";

type ServiceType = "daycare" | "hotel";
type MoodValue = "happy" | "content" | "shy" | "tired";
type EnergyValue = "high" | "medium" | "low";
type SocialValue = "social" | "selective" | "independent";
type FavoriteActivity =
  | "fetch"
  | "group-play"
  | "water-play"
  | "sniffing"
  | "training"
  | "cuddles"
  | "rest";
type AppetiteValue = "ate-all" | "ate-most" | "ate-some" | "refused";
type PottyValue = "normal" | "irregular" | "accident";
type MedsValue = "given" | "not-needed" | "missed";
type HolidayValue = "yes" | "no";

interface ReportCardInput {
  mood: MoodValue;
  energy: EnergyValue;
  socialization: SocialValue;
  playNotes: string;
  bestFriends: string;
  favoriteActivities: FavoriteActivity[];
  appetite: AppetiteValue;
  potty: PottyValue;
  meds: MedsValue;
  holiday: HolidayValue;
  holidayNote: string;
  closingComment: string;
}

interface ReportCardGeneratedSections {
  todaysVibe: string;
  friendsAndFun: string;
  careMetrics: string;
  holidaySparkle?: string;
  closingNote: string;
}

interface ReportCardEntry {
  id: string;
  petId: number;
  petName: string;
  ownerName: string;
  facilityName: string;
  serviceType: ServiceType;
  visitDate: string;
  theme: string;
  photos: string[];
  input: ReportCardInput;
  generated: ReportCardGeneratedSections;
  delivery: {
    status: "pending" | "scheduled" | "sent";
    scheduledFor?: string;
    sentAt?: string;
  };
}

const emptyInput: ReportCardInput = {
  mood: "happy",
  energy: "medium",
  socialization: "social",
  playNotes: "",
  bestFriends: "",
  favoriteActivities: ["fetch"],
  appetite: "ate-all",
  potty: "normal",
  meds: "not-needed",
  holiday: "yes",
  holidayNote: "",
  closingComment: "",
};

const moodLabels: Record<MoodValue, string> = {
  happy: "happy and bubbly",
  content: "content and relaxed",
  shy: "gentle and a little shy",
  tired: "calm and cozy",
};

const energyLabels: Record<EnergyValue, string> = {
  high: "high",
  medium: "moderate",
  low: "low",
};

const socialLabels: Record<SocialValue, string> = {
  social: "a total social butterfly",
  selective: "selective with friends",
  independent: "independent but friendly",
};

const appetiteLabels: Record<AppetiteValue, string> = {
  "ate-all": "Ate everything",
  "ate-most": "Ate most of the meal",
  "ate-some": "Ate some of the meal",
  refused: "Wasn't very interested in meals",
};

const pottyLabels: Record<PottyValue, string> = {
  normal: "All normal",
  irregular: "A little irregular",
  accident: "Had a small accident",
};

const medsLabels: Record<MedsValue, string> = {
  given: "Taken easily",
  "not-needed": "Not needed",
  missed: "Not completed",
};

const favoriteActivityLabels: Record<FavoriteActivity, string> = {
  fetch: "a festive game of fetch",
  "group-play": "group play with friends",
  "water-play": "water play time",
  sniffing: "sniffing adventures",
  training: "a short training session",
  cuddles: "cuddles with the staff",
  rest: "cozy rest time",
};

const themeMeta: Record<
  string,
  { label: string; emoji: string; bannerClass: string }
> = {
  everyday: {
    label: "Everyday",
    emoji: "✨",
    bannerClass: "bg-gradient-to-r from-slate-100 to-slate-200",
  },
  christmas: {
    label: "Christmas Edition",
    emoji: "🎄",
    bannerClass: "bg-gradient-to-r from-emerald-100 to-red-100",
  },
  halloween: {
    label: "Halloween Edition",
    emoji: "🎃",
    bannerClass: "bg-gradient-to-r from-orange-100 to-violet-100",
  },
  easter: {
    label: "Easter Edition",
    emoji: "🐣",
    bannerClass: "bg-gradient-to-r from-yellow-100 to-pink-100",
  },
  thanksgiving: {
    label: "Thanksgiving Edition",
    emoji: "🦃",
    bannerClass: "bg-gradient-to-r from-amber-100 to-orange-100",
  },
  new_year: {
    label: "New Year Edition",
    emoji: "🎉",
    bannerClass: "bg-gradient-to-r from-blue-100 to-indigo-100",
  },
  valentines: {
    label: "Valentine's Day Edition",
    emoji: "💘",
    bannerClass: "bg-gradient-to-r from-pink-100 to-rose-100",
  },
};

const holidaySectionTitles: Record<string, string> = {
  christmas: "🎅 Santa’s Paw-formance Review",
  halloween: "🎃 Spooky Moment",
  easter: "🐣 Egg-stra Special Moment",
  thanksgiving: "🦃 Thankful Tails Moment",
  new_year: "🎉 New Year Sparkle",
  valentines: "💘 Valentine's Special Moment",
};

const holidayDefaults: Record<
  string,
  { yes: string; no: string }
> = {
  christmas: {
    yes: "made the Nice List today! They posed beautifully for photos and soaked up the holiday cheer like a pro.",
    no: "preferred a quieter corner while the holiday cheer was happening.",
  },
  halloween: {
    yes: "loved the spooky decorations and joined in the festive fun.",
    no: "was curious about the decorations and preferred to observe the trick-or-treat action from a comfy distance.",
  },
  easter: {
    yes: "hopped into the fun and enjoyed our springtime activities.",
    no: "enjoyed a calm day while the spring festivities took place.",
  },
  thanksgiving: {
    yes: "soaked up the gratitude and festive vibes today.",
    no: "kept things mellow while we celebrated.",
  },
  new_year: {
    yes: "sparkled through our celebration and loved the extra attention.",
    no: "took it easy while the celebration was happening.",
  },
  valentines: {
    yes: "soaked up the love and extra cuddles today.",
    no: "preferred a calmer day while we celebrated.",
  },
};

function replaceTokens(template: string, tokens: Record<string, string>) {
  return Object.entries(tokens).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, value),
    template,
  );
}

export default function DaycareReportCardsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const { reportCards: reportCardConfig, profile } = useSettings();
  const facilityName = profile.businessName;

  const [reportCards, setReportCards] = useState<ReportCardEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingCard, setViewingCard] = useState<ReportCardEntry | null>(null);

  const [serviceType, setServiceType] = useState<ServiceType>("daycare");
  const [selectedVisitId, setSelectedVisitId] = useState<string>("");
  const [selectedTheme, setSelectedTheme] = useState<string>(
    reportCardConfig.enabledThemes[0] ?? "everyday",
  );
  const [input, setInput] = useState<ReportCardInput>(emptyInput);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const daycareOptions = useMemo(
    () =>
      daycareCheckIns.map((visit) => ({
        id: visit.id,
        petId: visit.petId,
        petName: visit.petName,
        ownerName: visit.ownerName,
        visitDate: visit.checkInTime.split("T")[0],
      })),
    [],
  );

  const hotelOptions = useMemo(
    () =>
      boardingGuests.map((guest) => ({
        id: guest.id,
        petId: guest.petId,
        petName: guest.petName,
        ownerName: guest.ownerName,
        visitDate: guest.checkInDate.split("T")[0],
      })),
    [],
  );

  const visitOptions = serviceType === "daycare" ? daycareOptions : hotelOptions;
  const selectedVisit = visitOptions.find((visit) => visit.id === selectedVisitId);

  const themeOptions = useMemo(
    () =>
      reportCardConfig.enabledThemes.length > 0
        ? reportCardConfig.enabledThemes
        : ["everyday"],
    [reportCardConfig.enabledThemes],
  );

  const handleAddNew = () => {
    setServiceType("daycare");
    setSelectedVisitId("");
    setSelectedTheme(reportCardConfig.enabledThemes[0] ?? "everyday");
    setInput(emptyInput);
    setPhotoPreviews([]);
    setIsModalOpen(true);
  };

  const buildGeneratedSections = (
    entryInput: ReportCardInput,
    theme: string,
  ): ReportCardGeneratedSections => {
    const templates =
      reportCardConfig.templates[theme as ReportCardTheme] ??
      reportCardConfig.templates.everyday;
    const tokens = {
      petName: selectedVisit?.petName ?? "your pet",
      ownerName: selectedVisit?.ownerName ?? "there",
      facilityName,
      moodLabel: moodLabels[entryInput.mood],
      energyLabel: energyLabels[entryInput.energy],
      socialLabel: socialLabels[entryInput.socialization],
      playNote: entryInput.playNotes.trim() || "Enjoyed playtime throughout the day.",
      appetiteLabel: appetiteLabels[entryInput.appetite],
      pottyLabel: pottyLabels[entryInput.potty],
      medsLabel: medsLabels[entryInput.meds],
      holidayNote: entryInput.holidayNote.trim(),
      closingComment: entryInput.closingComment.trim(),
    };

    const petName = selectedVisit?.petName ?? "Your pet";
    const holidayDefault =
      holidayDefaults[theme]?.[entryInput.holiday] ??
      (entryInput.holiday === "yes"
        ? "loved the festive activity."
        : "enjoyed a calmer, cozy moment.");
    const holidayNote =
      entryInput.holidayNote.trim() || `${petName} ${holidayDefault}`;
    const holidayLine =
      entryInput.holiday === "yes"
        ? `During today's ${themeMeta[theme]?.label ?? "holiday"} activities, ${
            holidayNote
          }`
        : "";
    const energyLine =
      entryInput.energy === "medium"
        ? "They had a moderate energy level, enjoying playful moments with friends followed by some cozy rest time."
        : entryInput.energy === "high"
          ? "They had a high energy level, spending lots of time playing and exploring."
          : "They had a low energy level and appreciated extra rest and quiet breaks throughout the day.";

    const careStatusLines = [
      `Eating habits: ${appetiteLabels[entryInput.appetite]}`,
      `Potty habits: ${pottyLabels[entryInput.potty]}`,
      `Medication: ${medsLabels[entryInput.meds]}`,
    ];
    const careConcernNote =
      entryInput.appetite === "refused" || entryInput.appetite === "ate-some"
        ? `${petName} was a bit picky with meals today, which can happen. Please let us know if you'd like us to try a topper next time.`
        : entryInput.potty === "accident"
          ? `${petName} had a small potty accident today. We kept them comfortable and made sure they had extra breaks.`
          : entryInput.meds === "missed"
            ? `${petName}'s medication wasn't completed today. Please let us know if you'd like us to follow up.`
            : "";

    return {
      todaysVibe: [
        `${petName} was feeling ${moodLabels[entryInput.mood]} today!`,
        energyLine,
        holidayLine,
      ]
        .filter(Boolean)
        .join(" "),
      friendsAndFun: entryInput.bestFriends.trim()
        ? `Social life update: ${petName} was ${socialLabels[entryInput.socialization]} today! ${petName} especially enjoyed spending time with ${entryInput.bestFriends.trim()}, and ${petName}'s favorite activity was ${(entryInput.favoriteActivities.length
            ? entryInput.favoriteActivities
            : (["fetch"] as FavoriteActivity[])
          )
            .map(
              (activity: FavoriteActivity) => favoriteActivityLabels[activity],
            )
            .join(" followed by ")}${entryInput.playNotes.trim() ? `, ${entryInput.playNotes.trim()}` : ""}.`
        : `Social life update: ${petName} bonded closely with our amazing staff team today and enjoyed plenty of one-on-one attention.`,
      careMetrics: [
        `Eating habits: ${appetiteLabels[entryInput.appetite]}`,
        `Potty habits: ${pottyLabels[entryInput.potty]}`,
        `Medication: ${medsLabels[entryInput.meds]}`,
        careConcernNote,
      ]
        .filter(Boolean)
        .join("\n"),
      holidaySparkle:
        theme !== "everyday"
          ? replaceTokens(templates.holidaySparkle, {
              ...tokens,
              holidayNote,
            })
          : undefined,
      closingNote: replaceTokens(templates.closingNote, tokens),
    };
  };

  const handlePhotoUpload = (files: FileList | null) => {
    if (!files) return;
    const previews = Array.from(files).map((file) =>
      URL.createObjectURL(file),
    );
    setPhotoPreviews((prev) => [...prev, ...previews]);
  };

  const canSubmit =
    selectedVisitId &&
    input.closingComment.trim().length > 0 &&
    photoPreviews.length > 0;

  const handleSubmit = () => {
    if (!selectedVisit) return;

    const generated = buildGeneratedSections(input, selectedTheme);
    const now = new Date();
    const sendTime = reportCardConfig.autoSend.sendTime ?? "18:00";
    const scheduledFor = `${selectedVisit.visitDate}T${sendTime}:00`;
    const status =
      reportCardConfig.autoSend.mode === "immediate" ? "sent" : "scheduled";

    const newEntry: ReportCardEntry = {
      id: `rc-${now.getTime()}`,
      petId: selectedVisit.petId,
      petName: selectedVisit.petName,
      ownerName: selectedVisit.ownerName,
      facilityName,
      serviceType,
      visitDate: selectedVisit.visitDate,
      theme: selectedTheme,
      photos: photoPreviews,
      input,
      generated,
      delivery:
        status === "sent"
          ? { status, sentAt: now.toISOString() }
          : { status, scheduledFor },
    };

    setReportCards((prev) => [newEntry, ...prev]);
    setIsModalOpen(false);
  };

  const handleSendNow = (cardId: string) => {
    const sentAt = new Date().toISOString();
    setReportCards((prev) =>
      prev.map((rc) =>
        rc.id === cardId
          ? { ...rc, delivery: { status: "sent", sentAt } }
          : rc,
      ),
    );
  };

  const columns: ColumnDef<ReportCardEntry>[] = [
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
          <div>
            <p className="font-medium">{item.petName}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {item.serviceType}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "visitDate",
      label: "Visit Date",
      icon: Clock,
      defaultVisible: true,
      render: (item) => (
        <span>
          {new Date(item.visitDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "theme",
      label: "Theme",
      icon: Sparkles,
      defaultVisible: true,
      render: (item) => <Badge variant="outline">{item.theme}</Badge>,
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
      key: "delivery",
      label: "Delivery",
      icon: Mail,
      defaultVisible: true,
      render: (item) =>
        item.delivery.status === "sent" ? (
          <Badge variant="success">
            <Check className="h-3 w-3 mr-1" />
            Sent
          </Badge>
        ) : item.delivery.status === "scheduled" ? (
          <Badge variant="secondary">
            <CalendarClock className="h-3 w-3 mr-1" />
            Scheduled
          </Badge>
        ) : (
          <Badge variant="secondary">Pending</Badge>
        ),
    },
  ];

  const today = new Date().toISOString().split("T")[0];
  const todayCards = reportCards.filter((rc) => rc.visitDate === today).length;
  const sentCards = reportCards.filter((rc) => rc.delivery.status === "sent")
    .length;
  const scheduledCards = reportCards.filter(
    (rc) => rc.delivery.status === "scheduled",
  ).length;
  const viewingThemeMeta =
    themeMeta[viewingCard?.theme ?? "everyday"] ?? themeMeta.everyday;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <div className="space-y-6">
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
                <p className="text-2xl font-bold">{scheduledCards}</p>
                <p className="text-sm text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                  onClick={() => {
                    setViewingCard(item);
                    setIsViewModalOpen(true);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {item.delivery.status !== "sent" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSendNow(item.id)}
                    title="Resend now"
                  >
                    <Send className="h-4 w-4 text-primary" />
                  </Button>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Report Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Service Type</Label>
                <Select
                  value={serviceType}
                  onValueChange={(value: ServiceType) => {
                    setServiceType(value);
                    setSelectedVisitId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daycare">Daycare</SelectItem>
                    <SelectItem value="hotel">Hotel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select
                  value={selectedTheme}
                  onValueChange={(value) => setSelectedTheme(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {themeOptions.map((theme) => (
                      <SelectItem key={theme} value={theme}>
                        {theme.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select Pet</Label>
              <Select
                value={selectedVisitId}
                onValueChange={(value) => setSelectedVisitId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a pet" />
                </SelectTrigger>
                <SelectContent>
                  {visitOptions.map((visit) => (
                    <SelectItem key={visit.id} value={visit.id}>
                      {visit.petName} ({visit.ownerName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 rounded-lg border p-4">
              <Label>Auto-populated</Label>
              <div className="grid gap-2 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">Dog:</span>{" "}
                  {selectedVisit?.petName ?? "—"}
                </div>
                <div>
                  <span className="font-medium text-foreground">Owner:</span>{" "}
                  {selectedVisit?.ownerName ?? "—"}
                </div>
                <div>
                  <span className="font-medium text-foreground">Facility:</span>{" "}
                  {facilityName}
                </div>
                <div>
                  <span className="font-medium text-foreground">Visit date:</span>{" "}
                  {selectedVisit?.visitDate ?? "—"}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Mood & Energy</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Mood</Label>
                    <RadioGroup
                      value={input.mood}
                      onValueChange={(value: MoodValue) =>
                        setInput({ ...input, mood: value })
                      }
                    >
                      {(["happy", "content", "shy", "tired"] as const).map(
                        (value) => (
                          <div key={value} className="flex items-center gap-2">
                            <RadioGroupItem value={value} id={`mood-${value}`} />
                            <Label htmlFor={`mood-${value}`}>
                              {value.charAt(0).toUpperCase() + value.slice(1)}
                            </Label>
                          </div>
                        ),
                      )}
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Energy</Label>
                    <RadioGroup
                      value={input.energy}
                      onValueChange={(value: EnergyValue) =>
                        setInput({ ...input, energy: value })
                      }
                    >
                      {(["high", "medium", "low"] as const).map((value) => (
                        <div key={value} className="flex items-center gap-2">
                          <RadioGroupItem value={value} id={`energy-${value}`} />
                          <Label htmlFor={`energy-${value}`}>
                            {value.charAt(0).toUpperCase() + value.slice(1)}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Socialization & Play</Label>
                <RadioGroup
                  value={input.socialization}
                  onValueChange={(value: SocialValue) =>
                    setInput({ ...input, socialization: value })
                  }
                >
                  {(["social", "selective", "independent"] as const).map(
                    (value) => (
                      <div key={value} className="flex items-center gap-2">
                        <RadioGroupItem
                          value={value}
                          id={`social-${value}`}
                        />
                        <Label htmlFor={`social-${value}`}>
                          {value.charAt(0).toUpperCase() + value.slice(1)}
                        </Label>
                      </div>
                    ),
                  )}
                </RadioGroup>
                <Input
                  value={input.bestFriends}
                  onChange={(e) =>
                    setInput({ ...input, bestFriends: e.target.value })
                  }
                  placeholder="Best friends (e.g., Luna and Max)"
                />
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">
                    Favorite activity
                  </Label>
                  <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                    {(
                      [
                        "fetch",
                        "group-play",
                        "water-play",
                        "sniffing",
                        "training",
                        "cuddles",
                        "rest",
                      ] as const
                    ).map((activity) => {
                      const checked = input.favoriteActivities.includes(activity);
                      return (
                        <div
                          key={activity}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            id={`activity-${activity}`}
                            checked={checked}
                            onCheckedChange={(value) => {
                              const next = value === true;
                              setInput({
                                ...input,
                                favoriteActivities: next
                                  ? [...input.favoriteActivities, activity]
                                  : input.favoriteActivities.filter(
                                      (item) => item !== activity,
                                    ),
                              });
                            }}
                          />
                          <Label htmlFor={`activity-${activity}`}>
                            {activity.replace("-", " ")}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Input
                  value={input.playNotes}
                  onChange={(e) =>
                    setInput({ ...input, playNotes: e.target.value })
                  }
                  placeholder="Optional play note (e.g., loved fetch)"
                />
              </div>

              <div className="space-y-2">
                <Label>Wellness & Habits</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Meals</Label>
                    <RadioGroup
                      value={input.appetite}
                      onValueChange={(value: AppetiteValue) =>
                        setInput({ ...input, appetite: value })
                      }
                    >
                      {(["ate-all", "ate-most", "ate-some", "refused"] as const).map(
                        (value) => (
                          <div key={value} className="flex items-center gap-2">
                            <RadioGroupItem
                              value={value}
                              id={`appetite-${value}`}
                            />
                            <Label htmlFor={`appetite-${value}`}>
                              {value.replace("-", " ")}
                            </Label>
                          </div>
                        ),
                      )}
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Potty</Label>
                    <RadioGroup
                      value={input.potty}
                      onValueChange={(value: PottyValue) =>
                        setInput({ ...input, potty: value })
                      }
                    >
                      {(["normal", "irregular", "accident"] as const).map((value) => (
                        <div key={value} className="flex items-center gap-2">
                          <RadioGroupItem value={value} id={`potty-${value}`} />
                          <Label htmlFor={`potty-${value}`}>
                            {value.charAt(0).toUpperCase() + value.slice(1)}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Meds</Label>
                    <RadioGroup
                      value={input.meds}
                      onValueChange={(value: MedsValue) =>
                        setInput({ ...input, meds: value })
                      }
                    >
                      {(["given", "not-needed", "missed"] as const).map((value) => (
                        <div key={value} className="flex items-center gap-2">
                          <RadioGroupItem value={value} id={`meds-${value}`} />
                          <Label htmlFor={`meds-${value}`}>
                            {value.replace("-", " ")}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Holiday Question</Label>
                <RadioGroup
                  value={input.holiday}
                  onValueChange={(value: HolidayValue) =>
                    setInput({ ...input, holiday: value })
                  }
                >
                  {(["yes", "no"] as const).map((value) => (
                    <div key={value} className="flex items-center gap-2">
                      <RadioGroupItem value={value} id={`holiday-${value}`} />
                      <Label htmlFor={`holiday-${value}`}>
                        {value === "yes"
                          ? "Joined the holiday activity"
                          : "No holiday activity"}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                <Input
                  value={input.holidayNote}
                  onChange={(e) =>
                    setInput({ ...input, holidayNote: e.target.value })
                  }
                  placeholder="Optional holiday note"
                />
              </div>

              <div className="space-y-2">
                <Label>Closing Comment (1-2 sentences)</Label>
                <Textarea
                  value={input.closingComment}
                  onChange={(e) =>
                    setInput({ ...input, closingComment: e.target.value })
                  }
                  placeholder="Add a personal note for the owner..."
                />
              </div>

              <div className="space-y-2">
                <Label>Photos (at least 1, holiday/festive preferred)</Label>
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e.target.files)}
                />
                <div className="flex flex-wrap gap-2">
                  {photoPreviews.map((photo, index) => (
                    <div
                      key={`${photo}-${index}`}
                      className="w-20 h-20 rounded-lg border overflow-hidden bg-muted"
                    >
                      <img
                        src={photo}
                        alt="Report card"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between">
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>
                Delivery:{" "}
                {reportCardConfig.autoSend.mode === "immediate"
                  ? "send immediately"
                  : `scheduled at ${reportCardConfig.autoSend.sendTime ?? "18:00"}`}
              </div>
              <div>
                Channels:{" "}
                {[
                  reportCardConfig.autoSend.channels.email ? "email" : null,
                  reportCardConfig.autoSend.channels.message ? "message" : null,
                ]
                  .filter(Boolean)
                  .join(", ") || "none"}
              </div>
              <div
                className={cn(
                  photoPreviews.length > 0
                    ? "text-muted-foreground"
                    : "text-destructive",
                )}
              >
                {photoPreviews.length > 0
                  ? `${photoPreviews.length} photo(s) added`
                  : "Add at least one photo to continue"}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                Generate & Send
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PawPrint className="h-5 w-5" />
              Report Card - {viewingCard?.petName}
            </DialogTitle>
          </DialogHeader>
          {viewingCard && (
            <div className="space-y-6">
              <div className="rounded-xl border overflow-hidden">
                <div
                  className={cn(
                    "flex items-center justify-between px-4 py-3 text-sm",
                    viewingThemeMeta.bannerClass,
                  )}
                >
                  <span className="font-medium">
                    {viewingThemeMeta.emoji} {viewingThemeMeta.label}
                  </span>
                  <Badge variant="outline" className="bg-white/80">
                    {viewingThemeMeta.label}
                  </Badge>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg border bg-white flex items-center justify-center overflow-hidden">
                        {profile.logo ? (
                          <img
                            src={profile.logo}
                            alt={`${facilityName} logo`}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <PawPrint className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Facility
                        </p>
                        <p className="font-semibold">{facilityName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-medium">
                        {new Date(viewingCard.visitDate).toLocaleDateString(
                          "en-US",
                          {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Dog name</p>
                      <p className="font-medium">{viewingCard.petName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Parent name
                      </p>
                      <p className="font-medium">{viewingCard.ownerName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Service type
                      </p>
                      <p className="font-medium capitalize">
                        {viewingCard.serviceType}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Theme</p>
                      <p className="font-medium">
                        {viewingThemeMeta.emoji} {viewingThemeMeta.label}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Today's vibe</h3>
                <p className="text-sm text-muted-foreground">
                  {viewingCard.generated.todaysVibe}
                </p>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold">Friends & fun</h3>
                <p className="text-sm text-muted-foreground">
                  {viewingCard.generated.friendsAndFun}
                </p>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold">Care metrics</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {viewingCard.generated.careMetrics
                    .split("\n")
                    .filter(Boolean)
                    .map((line, index) => {
                      const normalized = line.toLowerCase();
                      const prefix = normalized.startsWith("eating habits")
                        ? "🍽 "
                        : normalized.startsWith("potty habits")
                          ? "🚽 "
                          : normalized.startsWith("medication")
                            ? "💊 "
                            : "";
                      return (
                        <p key={`${line}-${index}`}>
                          {prefix}
                          {line}
                        </p>
                      );
                    })}
                </div>
              </div>
              {viewingCard.generated.holidaySparkle && (
                <div className="space-y-3">
                  <h3 className="font-semibold">
                    {holidaySectionTitles[viewingCard.theme] ??
                      "Holiday special moment"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {viewingCard.generated.holidaySparkle}
                  </p>
                </div>
              )}
              <div className="space-y-3">
                <h3 className="font-semibold">A Personal Note from the Team</h3>
                <p className="text-sm text-muted-foreground">
                  💖 From our team:
                </p>
                <p className="text-sm text-muted-foreground italic">
                  "{viewingCard.input.closingComment}"
                </p>
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">With love,</p>
                <p>The {viewingCard.facilityName} Team 🐶</p>
                <p>
                  Thanks for trusting us with {viewingCard.petName}'s day!
                </p>
                <p className="text-xs text-muted-foreground">
                  Reply to this message if you have any questions 💬
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Photo Highlight</h3>
                {viewingCard.photos.length > 0 ? (
                  <div className="space-y-3">
                    <div className="w-full h-56 rounded-xl overflow-hidden border bg-muted">
                      <img
                        src={viewingCard.photos[0]}
                        alt="Report card hero"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    {viewingCard.photos.length > 1 && (
                      <div className="flex flex-wrap gap-2">
                        {viewingCard.photos.slice(1).map((photo, index) => (
                          <div
                            key={`${photo}-${index}`}
                            className="w-20 h-20 rounded-lg border overflow-hidden bg-muted"
                          >
                            <img
                              src={photo}
                              alt="Report card thumbnail"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No photos attached.
                  </p>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Internal delivery controls
                </div>
                <div className="flex items-center justify-between">
                  {viewingCard.delivery.status === "sent" ? (
                    <Badge variant="success">
                      <Check className="h-3 w-3 mr-1" />
                      Sent
                      {viewingCard.delivery.sentAt &&
                        ` at ${new Date(
                          viewingCard.delivery.sentAt,
                        ).toLocaleTimeString()}`}
                    </Badge>
                  ) : viewingCard.delivery.status === "scheduled" ? (
                    <Badge variant="secondary">
                      <CalendarClock className="h-3 w-3 mr-1" />
                      Scheduled for{" "}
                      {viewingCard.delivery.scheduledFor
                        ? new Date(
                            viewingCard.delivery.scheduledFor,
                          ).toLocaleTimeString()
                        : "later"}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                  {viewingCard.delivery.status !== "sent" && (
                    <Button onClick={() => handleSendNow(viewingCard.id)}>
                      <Send className="h-4 w-4 mr-2" />
                      Send now
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
