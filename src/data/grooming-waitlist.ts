// Mock waitlist entries for the grooming calendar. Dates cluster around the
// current week so the indicators are visible without depending on real time.

export type GroomingWaitlistEntry = {
  id: string;
  date: string;
  petName: string;
  petBreed: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  serviceName: string;
  preferredStylistName?: string;
  preferredTimeWindow?: "morning" | "afternoon" | "anytime";
  addedAt: string;
  notes?: string;
};

export const groomingWaitlist: GroomingWaitlistEntry[] = [
  {
    id: "wl-01",
    date: "2026-05-14",
    petName: "Mochi",
    petBreed: "Shih Tzu",
    ownerName: "Aman Patel",
    ownerPhone: "(514) 555-0142",
    ownerEmail: "aman.patel@example.com",
    serviceName: "Full Groom",
    preferredStylistName: "Sarah Chen",
    preferredTimeWindow: "morning",
    addedAt: "2026-05-12T09:30:00Z",
    notes: "Anxious in the dryer — please use low setting.",
  },
  {
    id: "wl-02",
    date: "2026-05-14",
    petName: "Biscuit",
    petBreed: "Golden Retriever",
    ownerName: "Marie Tremblay",
    ownerPhone: "(514) 555-0188",
    serviceName: "Bath & Brush",
    preferredTimeWindow: "afternoon",
    addedAt: "2026-05-13T14:10:00Z",
  },
  {
    id: "wl-03",
    date: "2026-05-15",
    petName: "Pixel",
    petBreed: "Poodle Mix",
    ownerName: "Jordan Lee",
    ownerPhone: "(514) 555-0201",
    ownerEmail: "jordan@example.com",
    serviceName: "Full Groom",
    preferredTimeWindow: "anytime",
    addedAt: "2026-05-13T17:45:00Z",
  },
  {
    id: "wl-04",
    date: "2026-05-16",
    petName: "Tofu",
    petBreed: "French Bulldog",
    ownerName: "Sasha Petrov",
    ownerPhone: "(514) 555-0299",
    serviceName: "Nail Trim",
    preferredTimeWindow: "morning",
    addedAt: "2026-05-13T11:00:00Z",
    notes: "Walk-in OK if a cancellation opens.",
  },
  {
    id: "wl-05",
    date: "2026-05-19",
    petName: "Cleo",
    petBreed: "Maltese",
    ownerName: "Pierre Dupont",
    ownerPhone: "(514) 555-0317",
    serviceName: "Full Groom",
    preferredStylistName: "Marcus Reyes",
    preferredTimeWindow: "afternoon",
    addedAt: "2026-05-14T08:20:00Z",
  },
  {
    id: "wl-06",
    date: "2026-05-21",
    petName: "Rocky",
    petBreed: "Labrador",
    ownerName: "Nadia Hassan",
    ownerPhone: "(514) 555-0354",
    serviceName: "De-shedding Treatment",
    preferredTimeWindow: "anytime",
    addedAt: "2026-05-14T10:50:00Z",
  },
  {
    id: "wl-07",
    date: "2026-05-21",
    petName: "Toby",
    petBreed: "Bichon",
    ownerName: "Léa Martin",
    ownerPhone: "(514) 555-0398",
    ownerEmail: "lea.m@example.com",
    serviceName: "Full Groom",
    preferredStylistName: "Sarah Chen",
    preferredTimeWindow: "morning",
    addedAt: "2026-05-14T12:15:00Z",
    notes: "Repeat client — same trim as last visit.",
  },
];
