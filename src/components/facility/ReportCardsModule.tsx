"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { useAiSummary } from "@/hooks/use-ai-summary";
import { businessProfile } from "@/data/settings";
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
  Bell,
  Ghost,
  Egg,
  Heart,
  PartyPopper,
  Star,
} from "lucide-react";
import { daycareCheckIns } from "@/data/daycare";
import { boardingGuests } from "@/data/boarding";
import { groomingAppointments } from "@/data/grooming";
import { enrollments as trainingEnrollments } from "@/data/training";
import { useSettings } from "@/hooks/use-settings";
import type { ReportCardTheme, ReportCardSectionId } from "@/types/facility";
import { cn } from "@/lib/utils";

type ServiceType = "daycare" | "hotel" | "grooming" | "training";
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
  overallFeedback?: string;
  customAnswers?: Record<string, string>;
  petConditions?: Record<string, string>;
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

interface ThemeStyle {
  label: string;
  emoji: string;
  bannerClass: string;
  /** Full card background - the outer themed wrapper */
  cardBg: string;
  /** Accent color for date band, section headers */
  accentBg: string;
  accentText: string;
  /** Decorative icon component - shown in corner */
  DecorativeIcon: React.ComponentType<{ className?: string }>;
  /** Position of main decorative icon */
  iconPosition: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  /** Background pattern - snowflakes, spiderwebs, etc. */
  patternClass?: string;
}

const themeMeta: Record<string, ThemeStyle> = {
  everyday: {
    label: "Everyday",
    emoji: "✨",
    bannerClass: "bg-slate-100",
    cardBg: "bg-slate-50",
    accentBg: "bg-slate-600",
    accentText: "text-white",
    DecorativeIcon: Star,
    iconPosition: "top-right",
  },
  christmas: {
    label: "Christmas Edition",
    emoji: "🎄",
    bannerClass: "bg-red-50",
    cardBg: "bg-red-50",
    accentBg: "bg-red-600",
    accentText: "text-white",
    DecorativeIcon: Bell,
    iconPosition: "top-right",
    patternClass: "report-card-pattern-snowflakes",
  },
  halloween: {
    label: "Halloween Edition",
    emoji: "🎃",
    bannerClass: "bg-orange-50",
    cardBg: "bg-orange-50",
    accentBg: "bg-violet-700",
    accentText: "text-white",
    DecorativeIcon: Ghost,
    iconPosition: "top-right",
    patternClass: "report-card-pattern-spiderweb",
  },
  easter: {
    label: "Easter Edition",
    emoji: "🐣",
    bannerClass: "bg-pink-50",
    cardBg: "bg-pink-50",
    accentBg: "bg-pink-500",
    accentText: "text-white",
    DecorativeIcon: Egg,
    iconPosition: "bottom-right",
  },
  thanksgiving: {
    label: "Thanksgiving Edition",
    emoji: "🦃",
    bannerClass: "bg-amber-50",
    cardBg: "bg-amber-50",
    accentBg: "bg-amber-600",
    accentText: "text-white",
    DecorativeIcon: Star,
    iconPosition: "top-right",
  },
  new_year: {
    label: "New Year Edition",
    emoji: "🎉",
    bannerClass: "bg-indigo-50",
    cardBg: "bg-indigo-50",
    accentBg: "bg-indigo-600",
    accentText: "text-white",
    DecorativeIcon: PartyPopper,
    iconPosition: "top-right",
  },
  valentines: {
    label: "Valentine's Day Edition",
    emoji: "💘",
    bannerClass: "bg-rose-50",
    cardBg: "bg-rose-50",
    accentBg: "bg-rose-500",
    accentText: "text-white",
    DecorativeIcon: Heart,
    iconPosition: "top-right",
  },
};

const holidaySectionTitles: Record<string, string> = {
  christmas: "🎅 Santa's Paw-formance Review",
  halloween: "🎃 Spooky Moment",
  easter: "🐣 Egg-stra Special Moment",
  thanksgiving: "🦃 Thankful Tails Moment",
  new_year: "🎉 New Year Sparkle",
  valentines: "💘 Valentine's Special Moment",
};

const holidayDefaults: Record<string, { yes: string; no: string }> = {
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

export function ReportCardsModule({
  defaultServiceType = "daycare" as ServiceType,
}) {
  const isMounted = useHydrated();
  const { reportCards: reportCardConfig, profile } = useSettings();
  const facilityName = profile.businessName;

  const getEnabledSections = (svcType: string): ReportCardSectionId[] => {
    const svcId = svcType === "hotel" ? "boarding" : svcType;
    const svcCfg = reportCardConfig.serviceConfigs?.find(
      (s) => s.serviceId === svcId,
    );
    return (
      svcCfg?.enabledSections ?? [
        "todaysVibe",
        "friendsAndFun",
        "careMetrics",
        "holidaySparkle",
        "closingNote",
        "photoShowcase",
      ]
    );
  };

  const overallFeedbackConfig = reportCardConfig.overallFeedback ?? {
    title: "Overall Experience",
    responseOptions: ["Excellent", "Good", "Fair", "Needs Attention"],
  };
  const customQuestionsConfig = reportCardConfig.customQuestions ?? [];
  const petConditionConfig = reportCardConfig.petCondition ?? {
    categories: [],
  };

  const [reportCards, setReportCards] = useState<ReportCardEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingCard, setViewingCard] = useState<ReportCardEntry | null>(null);

  const [serviceType, setServiceType] =
    useState<ServiceType>(defaultServiceType);
  const [selectedVisitId, setSelectedVisitId] = useState<string>("");
  const [selectedTheme, setSelectedTheme] = useState<string>(
    reportCardConfig.enabledThemes[0] ?? "everyday",
  );
  const [input, setInput] = useState<ReportCardInput>(emptyInput);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const rcAi = useAiSummary();

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

  const groomingOptions = useMemo(
    () =>
      groomingAppointments.map((appt) => ({
        id: appt.id,
        petId: appt.petId,
        petName: appt.petName,
        ownerName: appt.ownerName,
        visitDate: appt.date,
      })),
    [],
  );

  const trainingOptions = useMemo(
    () =>
      trainingEnrollments.map((enroll) => ({
        id: enroll.id,
        petId: enroll.petId,
        petName: enroll.petName,
        ownerName: enroll.ownerName,
        visitDate: enroll.enrollmentDate,
      })),
    [],
  );

  const visitOptions =
    serviceType === "daycare"
      ? daycareOptions
      : serviceType === "hotel"
        ? hotelOptions
        : serviceType === "grooming"
          ? groomingOptions
          : trainingOptions;
  const selectedVisit = visitOptions.find(
    (visit) => visit.id === selectedVisitId,
  );

  const themeOptions = useMemo(
    () =>
      reportCardConfig.enabledThemes.length > 0
        ? reportCardConfig.enabledThemes
        : ["everyday"],
    [reportCardConfig.enabledThemes],
  );

  const handleAddNew = () => {
    setServiceType(defaultServiceType);
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
      playNote:
        entryInput.playNotes.trim() || "Enjoyed playtime throughout the day.",
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

    const _careStatusLines = [
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
        ? `Social life update: ${petName} was ${socialLabels[entryInput.socialization]} today! ${petName} especially enjoyed spending time with ${entryInput.bestFriends.trim()}, and ${petName}'s favorite activity was ${(entryInput
            .favoriteActivities.length
            ? entryInput.favoriteActivities
            : (["fetch"] as FavoriteActivity[])
          )
            .map(
              (activity: FavoriteActivity) => favoriteActivityLabels[activity],
            )
            .join(
              " followed by ",
            )}${entryInput.playNotes.trim() ? `, ${entryInput.playNotes.trim()}` : ""}.`
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
    const previews = Array.from(files).map((file) => URL.createObjectURL(file));
    setPhotoPreviews((prev) => [...prev, ...previews]);
  };

  const canSubmit =
    selectedVisitId &&
    (input.closingComment.trim().length > 0 ||
      !getEnabledSections(serviceType).includes("closingNote")) &&
    (photoPreviews.length > 0 ||
      !getEnabledSections(serviceType).includes("photoShowcase"));

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
        rc.id === cardId ? { ...rc, delivery: { status: "sent", sentAt } } : rc,
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
          <div className="bg-primary/10 flex size-8 items-center justify-center rounded-full">
            <PawPrint className="text-primary size-4" />
          </div>
          <div>
            <p className="font-medium">{item.petName}</p>
            <p className="text-muted-foreground text-xs capitalize">
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
            <Check className="mr-1 size-3" />
            Sent
          </Badge>
        ) : item.delivery.status === "scheduled" ? (
          <Badge variant="secondary">
            <CalendarClock className="mr-1 size-3" />
            Scheduled
          </Badge>
        ) : (
          <Badge variant="secondary">Pending</Badge>
        ),
    },
  ];

  const today = new Date().toISOString().split("T")[0];
  const todayCards = reportCards.filter((rc) => rc.visitDate === today).length;
  const sentCards = reportCards.filter(
    (rc) => rc.delivery.status === "sent",
  ).length;
  const scheduledCards = reportCards.filter(
    (rc) => rc.delivery.status === "scheduled",
  ).length;
  const viewingThemeMeta =
    themeMeta[viewingCard?.theme ?? "everyday"] ?? themeMeta.everyday;

  if (!isMounted) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-lg p-2">
                <FileText className="text-primary size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reportCards.length}</p>
                <p className="text-muted-foreground text-sm">Total Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-info/10 rounded-lg p-2">
                <Clock className="text-info size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayCards}</p>
                <p className="text-muted-foreground text-sm">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-success/10 rounded-lg p-2">
                <Mail className="text-success size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sentCards}</p>
                <p className="text-muted-foreground text-sm">Sent to Owners</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-warning/10 rounded-lg p-2">
                <Send className="text-warning size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{scheduledCards}</p>
                <p className="text-muted-foreground text-sm">Scheduled</p>
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
              <Plus className="mr-2 size-4" />
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
                  <Eye className="size-4" />
                </Button>
                {item.delivery.status !== "sent" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSendNow(item.id)}
                    title="Resend now"
                  >
                    <Send className="text-primary size-4" />
                  </Button>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
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
                    <SelectItem value="hotel">Boarding / Hotel</SelectItem>
                    <SelectItem value="grooming">Grooming</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
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
              <div className="text-muted-foreground grid gap-2 text-sm">
                <div>
                  <span className="text-foreground font-medium">Dog:</span>{" "}
                  {selectedVisit?.petName ?? "—"}
                </div>
                <div>
                  <span className="text-foreground font-medium">Owner:</span>{" "}
                  {selectedVisit?.ownerName ?? "—"}
                </div>
                <div>
                  <span className="text-foreground font-medium">Facility:</span>{" "}
                  {facilityName}
                </div>
                <div>
                  <span className="text-foreground font-medium">
                    Visit date:
                  </span>{" "}
                  {selectedVisit?.visitDate ?? "—"}
                </div>
              </div>
            </div>

            {(() => {
              const sections = getEnabledSections(serviceType);
              const has = (id: ReportCardSectionId) => sections.includes(id);
              return (
                <div className="space-y-4">
                  {/* Mood & Energy — todaysVibe */}
                  {has("todaysVibe") && (
                    <div className="space-y-2">
                      <Label>Mood & Energy</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-muted-foreground text-xs">
                            Mood
                          </Label>
                          <RadioGroup
                            value={input.mood}
                            onValueChange={(value: MoodValue) =>
                              setInput({ ...input, mood: value })
                            }
                          >
                            {(
                              ["happy", "content", "shy", "tired"] as const
                            ).map((value) => (
                              <div
                                key={value}
                                className="flex items-center gap-2"
                              >
                                <RadioGroupItem
                                  value={value}
                                  id={`mood-${value}`}
                                />
                                <Label htmlFor={`mood-${value}`}>
                                  {value.charAt(0).toUpperCase() +
                                    value.slice(1)}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground text-xs">
                            Energy
                          </Label>
                          <RadioGroup
                            value={input.energy}
                            onValueChange={(value: EnergyValue) =>
                              setInput({ ...input, energy: value })
                            }
                          >
                            {(["high", "medium", "low"] as const).map(
                              (value) => (
                                <div
                                  key={value}
                                  className="flex items-center gap-2"
                                >
                                  <RadioGroupItem
                                    value={value}
                                    id={`energy-${value}`}
                                  />
                                  <Label htmlFor={`energy-${value}`}>
                                    {value.charAt(0).toUpperCase() +
                                      value.slice(1)}
                                  </Label>
                                </div>
                              ),
                            )}
                          </RadioGroup>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Socialization & Play — friendsAndFun */}
                  {has("friendsAndFun") && (
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
                            <div
                              key={value}
                              className="flex items-center gap-2"
                            >
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
                        <Label className="text-muted-foreground text-xs">
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
                            const checked =
                              input.favoriteActivities.includes(activity);
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
                                        ? [
                                            ...input.favoriteActivities,
                                            activity,
                                          ]
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
                  )}

                  {/* Wellness & Habits — careMetrics */}
                  {has("careMetrics") && (
                    <div className="space-y-2">
                      <Label>Wellness & Habits</Label>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-muted-foreground text-xs">
                            Meals
                          </Label>
                          <RadioGroup
                            value={input.appetite}
                            onValueChange={(value: AppetiteValue) =>
                              setInput({ ...input, appetite: value })
                            }
                          >
                            {(
                              [
                                "ate-all",
                                "ate-most",
                                "ate-some",
                                "refused",
                              ] as const
                            ).map((value) => (
                              <div
                                key={value}
                                className="flex items-center gap-2"
                              >
                                <RadioGroupItem
                                  value={value}
                                  id={`appetite-${value}`}
                                />
                                <Label htmlFor={`appetite-${value}`}>
                                  {value.replace("-", " ")}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground text-xs">
                            Potty
                          </Label>
                          <RadioGroup
                            value={input.potty}
                            onValueChange={(value: PottyValue) =>
                              setInput({ ...input, potty: value })
                            }
                          >
                            {(["normal", "irregular", "accident"] as const).map(
                              (value) => (
                                <div
                                  key={value}
                                  className="flex items-center gap-2"
                                >
                                  <RadioGroupItem
                                    value={value}
                                    id={`potty-${value}`}
                                  />
                                  <Label htmlFor={`potty-${value}`}>
                                    {value.charAt(0).toUpperCase() +
                                      value.slice(1)}
                                  </Label>
                                </div>
                              ),
                            )}
                          </RadioGroup>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-muted-foreground text-xs">
                            Meds
                          </Label>
                          <RadioGroup
                            value={input.meds}
                            onValueChange={(value: MedsValue) =>
                              setInput({ ...input, meds: value })
                            }
                          >
                            {(["given", "not-needed", "missed"] as const).map(
                              (value) => (
                                <div
                                  key={value}
                                  className="flex items-center gap-2"
                                >
                                  <RadioGroupItem
                                    value={value}
                                    id={`meds-${value}`}
                                  />
                                  <Label htmlFor={`meds-${value}`}>
                                    {value.replace("-", " ")}
                                  </Label>
                                </div>
                              ),
                            )}
                          </RadioGroup>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Holiday Question — holidaySparkle */}
                  {has("holidaySparkle") && (
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
                            <RadioGroupItem
                              value={value}
                              id={`holiday-${value}`}
                            />
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
                  )}

                  {/* Overall Feedback — overallFeedback */}
                  {has("overallFeedback") && (
                    <div className="space-y-2">
                      <Label>{overallFeedbackConfig.title}</Label>
                      <RadioGroup
                        value={input.overallFeedback ?? ""}
                        onValueChange={(value) =>
                          setInput({ ...input, overallFeedback: value })
                        }
                      >
                        {overallFeedbackConfig.responseOptions.map((opt) => (
                          <div key={opt} className="flex items-center gap-2">
                            <RadioGroupItem value={opt} id={`overall-${opt}`} />
                            <Label htmlFor={`overall-${opt}`}>{opt}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}

                  {/* Custom Feedback — customFeedback */}
                  {has("customFeedback") &&
                    customQuestionsConfig.length > 0 && (
                      <div className="space-y-3">
                        <Label>Custom Feedback</Label>
                        {customQuestionsConfig.map((q) => (
                          <div key={q.id} className="space-y-1">
                            <Label className="text-muted-foreground text-xs">
                              {q.question}
                              {q.required && " *"}
                            </Label>
                            {q.type === "text" && (
                              <Input
                                value={input.customAnswers?.[q.id] ?? ""}
                                onChange={(e) =>
                                  setInput({
                                    ...input,
                                    customAnswers: {
                                      ...input.customAnswers,
                                      [q.id]: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Your answer..."
                              />
                            )}
                            {q.type === "yes_no" && (
                              <RadioGroup
                                value={input.customAnswers?.[q.id] ?? ""}
                                onValueChange={(v) =>
                                  setInput({
                                    ...input,
                                    customAnswers: {
                                      ...input.customAnswers,
                                      [q.id]: v,
                                    },
                                  })
                                }
                              >
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <RadioGroupItem
                                      value="yes"
                                      id={`cq-${q.id}-yes`}
                                    />
                                    <Label htmlFor={`cq-${q.id}-yes`}>
                                      Yes
                                    </Label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <RadioGroupItem
                                      value="no"
                                      id={`cq-${q.id}-no`}
                                    />
                                    <Label htmlFor={`cq-${q.id}-no`}>No</Label>
                                  </div>
                                </div>
                              </RadioGroup>
                            )}
                            {q.type === "rating" && (
                              <RadioGroup
                                value={input.customAnswers?.[q.id] ?? ""}
                                onValueChange={(v) =>
                                  setInput({
                                    ...input,
                                    customAnswers: {
                                      ...input.customAnswers,
                                      [q.id]: v,
                                    },
                                  })
                                }
                              >
                                <div className="flex items-center gap-3">
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <div
                                      key={n}
                                      className="flex items-center gap-1"
                                    >
                                      <RadioGroupItem
                                        value={String(n)}
                                        id={`cq-${q.id}-${n}`}
                                      />
                                      <Label htmlFor={`cq-${q.id}-${n}`}>
                                        {n}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </RadioGroup>
                            )}
                            {q.type === "select" && q.options && (
                              <Select
                                value={input.customAnswers?.[q.id] ?? ""}
                                onValueChange={(v) =>
                                  setInput({
                                    ...input,
                                    customAnswers: {
                                      ...input.customAnswers,
                                      [q.id]: v,
                                    },
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {q.options.map((opt) => (
                                    <SelectItem key={opt} value={opt}>
                                      {opt}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                  {/* Pet Condition — petCondition */}
                  {has("petCondition") &&
                    petConditionConfig.categories.length > 0 && (
                      <div className="space-y-3">
                        <Label>Pet Condition</Label>
                        {petConditionConfig.categories.map((cat) => (
                          <div key={cat.id} className="space-y-1">
                            <Label className="text-muted-foreground text-xs">
                              {cat.label}
                            </Label>
                            <Select
                              value={input.petConditions?.[cat.id] ?? ""}
                              onValueChange={(v) =>
                                setInput({
                                  ...input,
                                  petConditions: {
                                    ...input.petConditions,
                                    [cat.id]: v,
                                  },
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                {cat.options.map((opt) => (
                                  <SelectItem key={opt} value={opt}>
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    )}

                  {/* Closing Comment — closingNote */}
                  {has("closingNote") && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Closing Comment (1-2 sentences)</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs"
                          disabled={rcAi.isGenerating}
                          onClick={() => {
                            rcAi.generate("/api/ai/report-card-summary", {
                              petName: selectedVisit?.petName ?? "Pet",
                              facilityName: businessProfile.businessName,
                              serviceType: "daycare",
                              date: new Date().toISOString(),
                              mood: input.mood,
                              energy: input.energy,
                              socialization: input.socialization,
                              activities: input.favoriteActivities,
                              meals: input.appetite,
                              pottyStatus: input.potty,
                              conditions: Object.values(
                                input.petConditions ?? {},
                              ),
                              staffNotes: input.closingComment,
                              playNotes: input.playNotes,
                              bestFriends: input.bestFriends,
                            });
                          }}
                        >
                          <Sparkles className="size-3" />
                          {rcAi.isGenerating
                            ? "Generating..."
                            : "Generate with AI"}
                        </Button>
                      </div>
                      <Textarea
                        value={rcAi.summary || input.closingComment}
                        onChange={(e) => {
                          if (rcAi.summary) rcAi.setSummary(e.target.value);
                          setInput({
                            ...input,
                            closingComment: e.target.value,
                          });
                        }}
                        placeholder="Add a personal note for the owner..."
                      />
                      {rcAi.summary && (
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="gap-1 text-[10px]"
                          >
                            <Sparkles className="size-2.5" />
                            AI-Generated
                          </Badge>
                          <button
                            type="button"
                            className="text-muted-foreground text-[10px] underline"
                            onClick={() => {
                              setInput({
                                ...input,
                                closingComment: rcAi.summary,
                              });
                              rcAi.reset();
                            }}
                          >
                            Accept and clear AI
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Photos — photoShowcase */}
                  {has("photoShowcase") && (
                    <div className="space-y-2">
                      <Label>
                        Photos (at least 1, holiday/festive preferred)
                      </Label>
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
                            className="bg-muted h-20 w-20 overflow-hidden rounded-lg border"
                          >
                            <Image
                              src={photo}
                              alt="Report card"
                              width={80}
                              height={80}
                              className="size-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          <DialogFooter className="flex items-center justify-between">
            <div className="text-muted-foreground space-y-1 text-xs">
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
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PawPrint className="size-5" />
              Report Card - {viewingCard?.petName}
            </DialogTitle>
          </DialogHeader>
          {viewingCard && (
            <div className="space-y-6">
              {/* Full themed card */}
              <div
                className={cn(
                  "relative overflow-hidden rounded-2xl border",
                  viewingThemeMeta.cardBg,
                )}
              >
                {/* Decorative corner icon */}
                <viewingThemeMeta.DecorativeIcon
                  className={cn(
                    "absolute h-20 w-20 text-gray-900 opacity-[0.06]",
                    viewingThemeMeta.iconPosition === "top-right" &&
                      "-top-1 -right-1",
                    viewingThemeMeta.iconPosition === "top-left" &&
                      "-top-1 -left-1",
                    viewingThemeMeta.iconPosition === "bottom-right" &&
                      "-right-1 -bottom-1",
                    viewingThemeMeta.iconPosition === "bottom-left" &&
                      "-bottom-1 -left-1",
                  )}
                />

                {/* Themed accent header */}
                <div
                  className={cn(
                    "flex items-center gap-2 px-5 py-3",
                    viewingThemeMeta.accentBg,
                    viewingThemeMeta.accentText,
                  )}
                >
                  <span className="text-lg">{viewingThemeMeta.emoji}</span>
                  <h2 className="text-base font-bold">
                    {viewingThemeMeta.label}
                  </h2>
                </div>

                {/* Card body */}
                <div className="p-5">
                  {/* Date band */}
                  <div
                    className={cn(
                      "mb-4 rounded-lg px-4 py-2.5 text-sm font-medium",
                      viewingThemeMeta.accentBg,
                      viewingThemeMeta.accentText,
                    )}
                  >
                    {new Date(viewingCard.visitDate).toLocaleDateString(
                      "en-US",
                      {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      },
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex size-12 items-center justify-center overflow-hidden rounded-lg border bg-white">
                          {profile.logo ? (
                            <Image
                              src={profile.logo}
                              alt={`${facilityName} logo`}
                              width={48}
                              height={48}
                              className="size-full object-contain"
                            />
                          ) : (
                            <PawPrint className="text-muted-foreground size-5" />
                          )}
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">
                            Facility
                          </p>
                          <p className="font-semibold">{facilityName}</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-3 text-sm md:grid-cols-2">
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Dog name
                        </p>
                        <p className="font-medium">{viewingCard.petName}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Parent name
                        </p>
                        <p className="font-medium">{viewingCard.ownerName}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Service type
                        </p>
                        <p className="font-medium capitalize">
                          {viewingCard.serviceType}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Theme</p>
                        <p className="font-medium">
                          {viewingThemeMeta.emoji} {viewingThemeMeta.label}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Today&apos;s vibe</h3>
                <p className="text-muted-foreground text-sm">
                  {viewingCard.generated.todaysVibe}
                </p>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold">Friends & fun</h3>
                <p className="text-muted-foreground text-sm">
                  {viewingCard.generated.friendsAndFun}
                </p>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold">Care metrics</h3>
                <div className="text-muted-foreground space-y-2 text-sm">
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
                  <p className="text-muted-foreground text-sm">
                    {viewingCard.generated.holidaySparkle}
                  </p>
                </div>
              )}
              {viewingCard.input.overallFeedback && (
                <div className="space-y-3">
                  <h3 className="font-semibold">
                    {overallFeedbackConfig.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {viewingCard.input.overallFeedback}
                  </p>
                </div>
              )}
              {viewingCard.input.customAnswers &&
                Object.keys(viewingCard.input.customAnswers).length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold">Custom Feedback</h3>
                    <div className="text-muted-foreground space-y-2 text-sm">
                      {Object.entries(viewingCard.input.customAnswers).map(
                        ([qId, answer]) => {
                          const question = customQuestionsConfig.find(
                            (q) => q.id === qId,
                          );
                          return (
                            <div key={qId}>
                              <p className="text-foreground text-xs font-medium">
                                {question?.question ?? qId}
                              </p>
                              <p>{answer}</p>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}
              {viewingCard.input.petConditions &&
                Object.keys(viewingCard.input.petConditions).length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold">Pet Condition</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(viewingCard.input.petConditions).map(
                        ([catId, value]) => {
                          const cat = petConditionConfig.categories.find(
                            (c) => c.id === catId,
                          );
                          return (
                            <div key={catId}>
                              <p className="text-muted-foreground text-xs">
                                {cat?.label ?? catId}
                              </p>
                              <p className="font-medium">{value}</p>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}
              <div className="space-y-3">
                <h3 className="font-semibold">A Personal Note from the Team</h3>
                <p className="text-muted-foreground text-sm">
                  💖 From our team:
                </p>
                <p className="text-muted-foreground text-sm italic">
                  &quot;{viewingCard.input.closingComment}&quot;
                </p>
              </div>

              <div className="text-muted-foreground space-y-1 text-sm">
                <p className="text-foreground font-medium">With love,</p>
                <p>The {viewingCard.facilityName} Team 🐶</p>
                <p>
                  Thanks for trusting us with {viewingCard.petName}&apos;s day!
                </p>
                <p className="text-muted-foreground text-xs">
                  Reply to this message if you have any questions 💬
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Photo Highlight</h3>
                {viewingCard.photos.length > 0 ? (
                  <div className="space-y-3">
                    <div className="bg-muted relative h-56 w-full overflow-hidden rounded-xl border">
                      <Image
                        src={viewingCard.photos[0]}
                        alt="Report card hero"
                        fill
                        className="object-cover"
                      />
                    </div>
                    {viewingCard.photos.length > 1 && (
                      <div className="flex flex-wrap gap-2">
                        {viewingCard.photos.slice(1).map((photo, index) => (
                          <div
                            key={`${photo}-${index}`}
                            className="bg-muted h-20 w-20 overflow-hidden rounded-lg border"
                          >
                            <Image
                              src={photo}
                              alt="Report card thumbnail"
                              width={80}
                              height={80}
                              className="size-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No photos attached.
                  </p>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="text-muted-foreground mb-2 text-xs tracking-wide uppercase">
                  Internal delivery controls
                </div>
                <div className="flex items-center justify-between">
                  {viewingCard.delivery.status === "sent" ? (
                    <Badge variant="success">
                      <Check className="mr-1 size-3" />
                      Sent
                      {viewingCard.delivery.sentAt &&
                        ` at ${new Date(
                          viewingCard.delivery.sentAt,
                        ).toLocaleTimeString()}`}
                    </Badge>
                  ) : viewingCard.delivery.status === "scheduled" ? (
                    <Badge variant="secondary">
                      <CalendarClock className="mr-1 size-3" />
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
                      <Send className="mr-2 size-4" />
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
