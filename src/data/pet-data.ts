// Extended pet data - photos, vaccinations, report cards, relationships
export interface PetPhoto {
  id: string;
  petId: number;
  url: string;
  thumbnail: string;
  caption?: string;
  uploadedBy: string;
  uploadedById: number;
  uploadedAt: string;
  isPrimary: boolean;
}

export interface VaccinationRecord {
  id: string;
  petId: number;
  vaccineName: string;
  administeredDate: string;
  expiryDate: string;
  veterinarianName?: string;
  veterinaryClinic?: string;
  documentUrl?: string;
  nextDueDate?: string;
  reminderSent?: boolean;
  notes?: string;
  // Upload status for facility review
  status?: "pending_review" | "approved" | "rejected";
  reviewedBy?: string;
  reviewedById?: number;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface CareInstructions {
  petId: number;
  feedingSchedule?: string; // e.g., "8:00 AM, 12:00 PM, 6:00 PM"
  feedingAmount?: string; // e.g., "1 cup per meal"
  medicationList?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    notes?: string;
  }>;
  groomingSensitivities?: string; // e.g., "Sensitive to loud noises during grooming"
  behaviorNotes?: string; // Owner-provided behavior notes
  lastUpdated?: string;
  lastUpdatedBy?: string;
  lastUpdatedById?: number;
}

export interface ReportCard {
  id: string;
  petId: number;
  bookingId: number;
  date: string;
  serviceType: "daycare" | "boarding" | "grooming" | "training";
  activities: string[];
  meals: {
    time: string;
    food: string;
    amount: string;
    consumed: "all" | "most" | "some" | "none";
  }[];
  pottyBreaks: {
    time: string;
    type: "success" | "accident";
    notes?: string;
  }[];
  mood: "happy" | "calm" | "energetic" | "anxious" | "tired";
  photos: string[];
  staffNotes: string;
  createdBy: string;
  createdById: number;
  sentToOwner: boolean;
  sentAt?: string;
}

export interface PetRelationship {
  id: string;
  petId: number;
  relatedPetId: number;
  relatedPetName: string;
  relatedPetType: string;
  relatedPetBreed: string;
  relationshipType: "friend" | "enemy" | "neutral";
  notes?: string;
  createdAt: string;
  createdBy: string;
  createdById: number;
}

export interface PetTag {
  id: string;
  name: string;
  color: string; // tailwind color class e.g. "bg-blue-500"
  description?: string;
}

export interface PetTagAssignment {
  id: string;
  petId: number;
  tagId: string;
  assignedAt: string;
  assignedBy: string;
  assignedById: number;
}

export interface BanRecord {
  id: string;
  entityType: "client" | "pet";
  entityId: number;
  isBanned: boolean;
  reason: string;
  notes?: string;
  bannedAt: string;
  bannedBy: string;
  bannedById: number;
  unbannedAt?: string;
  unbannedBy?: string;
  unbannedById?: number;
}

export const petRelationships: PetRelationship[] = [
  {
    id: "rel-001",
    petId: 1, // Buddy
    relatedPetId: 3, // Max
    relatedPetName: "Max",
    relatedPetType: "Dog",
    relatedPetBreed: "Labrador",
    relationshipType: "friend",
    notes: "Best buddies! Love to play together during daycare.",
    createdAt: "2024-01-20T09:00:00Z",
    createdBy: "Sarah Johnson",
    createdById: 1,
  },
  {
    id: "rel-002",
    petId: 1, // Buddy
    relatedPetId: 5, // Rocky
    relatedPetName: "Rocky",
    relatedPetType: "Dog",
    relatedPetBreed: "German Shepherd",
    relationshipType: "enemy",
    notes:
      "Keep separated - had a scuffle on 2024-01-15. Buddy gets anxious around Rocky.",
    createdAt: "2024-01-16T10:30:00Z",
    createdBy: "Mike Davis",
    createdById: 2,
  },
  {
    id: "rel-003",
    petId: 1, // Buddy
    relatedPetId: 2, // Whiskers
    relatedPetName: "Whiskers",
    relatedPetType: "Cat",
    relatedPetBreed: "Siamese",
    relationshipType: "neutral",
    notes: "Same household - tolerates each other but don't interact much.",
    createdAt: "2024-01-10T08:00:00Z",
    createdBy: "Sarah Johnson",
    createdById: 1,
  },
  {
    id: "rel-004",
    petId: 3, // Max
    relatedPetId: 1, // Buddy
    relatedPetName: "Buddy",
    relatedPetType: "Dog",
    relatedPetBreed: "Golden Retriever",
    relationshipType: "friend",
    notes: "Best buddies! Love to play together during daycare.",
    createdAt: "2024-01-20T09:00:00Z",
    createdBy: "Sarah Johnson",
    createdById: 1,
  },
  {
    id: "rel-005",
    petId: 3, // Max
    relatedPetId: 5, // Rocky
    relatedPetName: "Rocky",
    relatedPetType: "Dog",
    relatedPetBreed: "German Shepherd",
    relationshipType: "friend",
    notes: "Good playmates, enjoy fetch together.",
    createdAt: "2024-02-01T11:00:00Z",
    createdBy: "Sarah Johnson",
    createdById: 1,
  },
  {
    id: "rel-006",
    petId: 5, // Rocky
    relatedPetId: 1, // Buddy
    relatedPetName: "Buddy",
    relatedPetType: "Dog",
    relatedPetBreed: "Golden Retriever",
    relationshipType: "enemy",
    notes: "Keep separated - had a scuffle on 2024-01-15.",
    createdAt: "2024-01-16T10:30:00Z",
    createdBy: "Mike Davis",
    createdById: 2,
  },
];

export const petPhotos: PetPhoto[] = [
  {
    id: "photo-001",
    petId: 1,
    url: "/photos/pets/buddy-1.jpg",
    thumbnail: "/photos/pets/thumbs/buddy-1.jpg",
    caption: "Buddy's first day at daycare!",
    uploadedBy: "Sarah Johnson",
    uploadedById: 1,
    uploadedAt: "2024-01-15T10:30:00Z",
    isPrimary: true,
  },
  {
    id: "photo-002",
    petId: 1,
    url: "/photos/pets/buddy-2.jpg",
    thumbnail: "/photos/pets/thumbs/buddy-2.jpg",
    caption: "Playing fetch in the yard",
    uploadedBy: "Mike Davis",
    uploadedById: 2,
    uploadedAt: "2024-02-10T14:15:00Z",
    isPrimary: false,
  },
  {
    id: "photo-003",
    petId: 1,
    url: "/photos/pets/buddy-3.jpg",
    thumbnail: "/photos/pets/thumbs/buddy-3.jpg",
    caption: "Nap time with friends",
    uploadedBy: "Sarah Johnson",
    uploadedById: 1,
    uploadedAt: "2024-03-01T16:00:00Z",
    isPrimary: false,
  },
  {
    id: "photo-004",
    petId: 2,
    url: "/photos/pets/whiskers-1.jpg",
    thumbnail: "/photos/pets/thumbs/whiskers-1.jpg",
    caption: "Whiskers enjoying the cat tower",
    uploadedBy: "Sarah Johnson",
    uploadedById: 1,
    uploadedAt: "2024-01-25T11:00:00Z",
    isPrimary: true,
  },
  {
    id: "photo-005",
    petId: 3,
    url: "/photos/pets/max-1.jpg",
    thumbnail: "/photos/pets/thumbs/max-1.jpg",
    caption: "Max's profile photo",
    uploadedBy: "Sarah Johnson",
    uploadedById: 1,
    uploadedAt: "2024-01-20T09:00:00Z",
    isPrimary: true,
  },
  {
    id: "photo-006",
    petId: 3,
    url: "/photos/pets/max-2.jpg",
    thumbnail: "/photos/pets/thumbs/max-2.jpg",
    caption: "After grooming session",
    uploadedBy: "Mike Davis",
    uploadedById: 2,
    uploadedAt: "2024-02-15T13:30:00Z",
    isPrimary: false,
  },
  {
    id: "photo-007",
    petId: 14,
    url: "/photos/pets/fluffy-1.jpg",
    thumbnail: "/photos/pets/thumbs/fluffy-1.jpg",
    caption: "Fluffy's first visit",
    uploadedBy: "Sarah Johnson",
    uploadedById: 1,
    uploadedAt: "2024-01-08T10:00:00Z",
    isPrimary: true,
  },
];

export const vaccinationRecords: VaccinationRecord[] = [
  {
    id: "vacc-001",
    petId: 1,
    vaccineName: "Rabies",
    administeredDate: "2024-01-20",
    expiryDate: "2025-01-20",
    nextDueDate: "2025-01-20",
    veterinarianName: "Dr. Emily Chen",
    veterinaryClinic: "Happy Paws Veterinary Clinic",
    documentUrl: "/documents/vaccinations/buddy-rabies-2024.pdf",
    reminderSent: false,
    notes: "No adverse reactions",
  },
  {
    id: "vacc-002",
    petId: 1,
    vaccineName: "DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)",
    administeredDate: "2024-01-20",
    expiryDate: "2025-01-20",
    nextDueDate: "2025-01-20",
    veterinarianName: "Dr. Emily Chen",
    veterinaryClinic: "Happy Paws Veterinary Clinic",
    documentUrl: "/documents/vaccinations/buddy-dhpp-2024.pdf",
    reminderSent: false,
  },
  {
    id: "vacc-003",
    petId: 1,
    vaccineName: "Bordetella",
    administeredDate: "2024-01-20",
    expiryDate: "2024-07-20",
    nextDueDate: "2024-07-20",
    veterinarianName: "Dr. Emily Chen",
    veterinaryClinic: "Happy Paws Veterinary Clinic",
    reminderSent: true,
    notes: "6-month booster required",
  },
  {
    id: "vacc-004",
    petId: 2,
    vaccineName:
      "FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)",
    administeredDate: "2024-02-01",
    expiryDate: "2025-02-01",
    nextDueDate: "2025-02-01",
    veterinarianName: "Dr. Michael Torres",
    veterinaryClinic: "Feline Health Center",
    documentUrl: "/documents/vaccinations/whiskers-fvrcp-2024.pdf",
    reminderSent: false,
  },
  {
    id: "vacc-005",
    petId: 2,
    vaccineName: "Rabies",
    administeredDate: "2024-02-01",
    expiryDate: "2025-02-01",
    nextDueDate: "2025-02-01",
    veterinarianName: "Dr. Michael Torres",
    veterinaryClinic: "Feline Health Center",
    reminderSent: false,
  },
  {
    id: "vacc-006",
    petId: 3,
    vaccineName: "Rabies",
    administeredDate: "2024-01-12",
    expiryDate: "2025-01-12",
    nextDueDate: "2025-01-12",
    veterinarianName: "Dr. Sarah Williams",
    veterinaryClinic: "PetCare Veterinary Hospital",
    documentUrl: "/documents/vaccinations/max-rabies-2024.pdf",
    reminderSent: false,
  },
  {
    id: "vacc-007",
    petId: 3,
    vaccineName: "DHPP",
    administeredDate: "2024-01-12",
    expiryDate: "2025-01-12",
    nextDueDate: "2025-01-12",
    veterinarianName: "Dr. Sarah Williams",
    veterinaryClinic: "PetCare Veterinary Hospital",
    reminderSent: false,
  },
  {
    id: "vacc-008",
    petId: 14,
    vaccineName: "FVRCP",
    administeredDate: "2024-01-08",
    expiryDate: "2025-01-08",
    nextDueDate: "2025-01-08",
    veterinarianName: "Dr. Michael Torres",
    veterinaryClinic: "Feline Health Center",
    documentUrl: "/documents/vaccinations/fluffy-fvrcp-2024.pdf",
    reminderSent: false,
  },
  {
    id: "vacc-009",
    petId: 13,
    vaccineName: "Rabies",
    administeredDate: "2024-01-03",
    expiryDate: "2025-01-03",
    nextDueDate: "2025-01-03",
    veterinarianName: "Dr. Emily Chen",
    veterinaryClinic: "Happy Paws Veterinary Clinic",
    documentUrl: "/documents/vaccinations/rex-rabies-2024.pdf",
    reminderSent: false,
  },
];

export const reportCards: ReportCard[] = [
  {
    id: "report-001",
    petId: 1,
    bookingId: 1,
    date: "2024-01-15",
    serviceType: "daycare",
    activities: [
      "Group play session (45 min)",
      "Fetch in the yard (30 min)",
      "Socialization with new friends",
      "Afternoon nap time",
    ],
    meals: [
      {
        time: "12:00 PM",
        food: "Kibble (Owner provided)",
        amount: "2 cups",
        consumed: "all",
      },
    ],
    pottyBreaks: [
      { time: "09:00 AM", type: "success" },
      { time: "12:30 PM", type: "success" },
      { time: "03:00 PM", type: "success" },
    ],
    mood: "happy",
    photos: [
      "/photos/reports/buddy-daycare-1.jpg",
      "/photos/reports/buddy-daycare-2.jpg",
    ],
    staffNotes:
      "Buddy had an amazing first day! He was very social and made lots of new friends. He especially loved playing fetch and running around in the yard. No issues at all!",
    createdBy: "Mike Davis",
    createdById: 2,
    sentToOwner: true,
    sentAt: "2024-01-15T17:00:00Z",
  },
  {
    id: "report-002",
    petId: 1,
    bookingId: 9,
    date: "2024-03-01",
    serviceType: "daycare",
    activities: [
      "Morning play group (60 min)",
      "Training session - recall practice",
      "Swimming pool time (20 min)",
      "Rest and relaxation",
    ],
    meals: [
      {
        time: "12:00 PM",
        food: "Kibble (Owner provided)",
        amount: "2 cups",
        consumed: "most",
      },
    ],
    pottyBreaks: [
      { time: "08:30 AM", type: "success" },
      { time: "01:00 PM", type: "success" },
      { time: "04:00 PM", type: "success" },
    ],
    mood: "energetic",
    photos: ["/photos/reports/buddy-daycare-3.jpg"],
    staffNotes:
      "Buddy was full of energy today! He loved the swimming pool and showed great recall during training. Left a little food but that's normal after so much activity.",
    createdBy: "Sarah Johnson",
    createdById: 1,
    sentToOwner: true,
    sentAt: "2024-03-01T17:30:00Z",
  },
  {
    id: "report-003",
    petId: 3,
    bookingId: 2,
    date: "2024-01-20",
    serviceType: "boarding",
    activities: [
      "Morning walk (30 min)",
      "Play session",
      "Afternoon walk (30 min)",
      "Evening cuddle time",
    ],
    meals: [
      {
        time: "08:00 AM",
        food: "Special diet (Owner provided)",
        amount: "1.5 cups",
        consumed: "all",
      },
      {
        time: "06:00 PM",
        food: "Special diet (Owner provided)",
        amount: "1.5 cups",
        consumed: "all",
      },
    ],
    pottyBreaks: [
      { time: "07:00 AM", type: "success" },
      { time: "12:00 PM", type: "success" },
      { time: "05:00 PM", type: "success" },
      { time: "09:00 PM", type: "success" },
    ],
    mood: "calm",
    photos: ["/photos/reports/max-boarding-1.jpg"],
    staffNotes:
      "Max did great on his first night! He ate all his meals and was very well-behaved. He seems comfortable and is adjusting well to his kennel.",
    createdBy: "Mike Davis",
    createdById: 2,
    sentToOwner: true,
    sentAt: "2024-01-20T20:00:00Z",
  },
  {
    id: "report-004",
    petId: 2,
    bookingId: 3,
    date: "2024-01-25",
    serviceType: "grooming",
    activities: [
      "Bath with special shampoo",
      "Blow dry and brush",
      "Nail trim",
      "Ear cleaning",
    ],
    meals: [],
    pottyBreaks: [],
    mood: "calm",
    photos: ["/photos/reports/whiskers-grooming-1.jpg"],
    staffNotes:
      "Whiskers was a perfect angel during grooming! Very cooperative with the bath and nail trim. She looks beautiful and smells great!",
    createdBy: "Sarah Johnson",
    createdById: 1,
    sentToOwner: true,
    sentAt: "2024-01-25T12:30:00Z",
  },
  {
    id: "report-005",
    petId: 14,
    bookingId: 4,
    date: "2024-02-01",
    serviceType: "daycare",
    activities: [
      "Cat tower playtime",
      "Feather toy chase",
      "Laser pointer fun",
      "Quiet time in cozy bed",
    ],
    meals: [
      {
        time: "12:00 PM",
        food: "Wet food (Owner provided)",
        amount: "1 can",
        consumed: "all",
      },
    ],
    pottyBreaks: [
      { time: "10:00 AM", type: "success", notes: "Litter box used" },
      { time: "02:00 PM", type: "success", notes: "Litter box used" },
    ],
    mood: "happy",
    photos: ["/photos/reports/fluffy-daycare-1.jpg"],
    staffNotes:
      "Fluffy had a wonderful day! She was very playful and enjoyed all the interactive toys. She's such a sweet cat!",
    createdBy: "Mike Davis",
    createdById: 2,
    sentToOwner: true,
    sentAt: "2024-02-01T18:00:00Z",
  },
];

// Pet Tags - predefined tags that can be assigned to pets
export const petTags: PetTag[] = [
  {
    id: "tag-001",
    name: "Aggressive",
    color: "bg-red-500",
    description: "Requires extra supervision and careful handling",
  },
  {
    id: "tag-002",
    name: "Escape Artist",
    color: "bg-orange-500",
    description: "Known to attempt escapes, needs secure enclosure",
  },
  {
    id: "tag-003",
    name: "Anxious",
    color: "bg-yellow-500",
    description: "Gets nervous easily, needs calm environment",
  },
  {
    id: "tag-004",
    name: "Senior",
    color: "bg-purple-500",
    description: "Older pet requiring gentler care",
  },
  {
    id: "tag-005",
    name: "Puppy/Kitten",
    color: "bg-pink-500",
    description: "Young pet requiring extra attention",
  },
  {
    id: "tag-006",
    name: "Medical Needs",
    color: "bg-blue-500",
    description: "Has ongoing medical requirements",
  },
  {
    id: "tag-007",
    name: "VIP",
    color: "bg-amber-500",
    description: "High-value client, prioritize service",
  },
  {
    id: "tag-008",
    name: "First Time",
    color: "bg-green-500",
    description: "New to the facility",
  },
  {
    id: "tag-009",
    name: "Reactive",
    color: "bg-rose-500",
    description: "Reactive to other animals",
  },
  {
    id: "tag-010",
    name: "Special Diet",
    color: "bg-cyan-500",
    description: "Has dietary restrictions or special food",
  },
];

// Pet Tag Assignments
export const petTagAssignments: PetTagAssignment[] = [
  {
    id: "assign-001",
    petId: 1, // Buddy
    tagId: "tag-007", // VIP
    assignedAt: "2024-01-15T09:00:00Z",
    assignedBy: "Sarah Johnson",
    assignedById: 1,
  },
  {
    id: "assign-002",
    petId: 3, // Max
    tagId: "tag-006", // Medical Needs
    assignedAt: "2024-01-20T10:00:00Z",
    assignedBy: "Sarah Johnson",
    assignedById: 1,
  },
  {
    id: "assign-003",
    petId: 3, // Max
    tagId: "tag-004", // Senior
    assignedAt: "2024-01-20T10:00:00Z",
    assignedBy: "Sarah Johnson",
    assignedById: 1,
  },
  {
    id: "assign-004",
    petId: 5, // Rocky
    tagId: "tag-001", // Aggressive
    assignedAt: "2024-01-16T11:00:00Z",
    assignedBy: "Mike Davis",
    assignedById: 2,
  },
  {
    id: "assign-005",
    petId: 5, // Rocky
    tagId: "tag-009", // Reactive
    assignedAt: "2024-01-16T11:00:00Z",
    assignedBy: "Mike Davis",
    assignedById: 2,
  },
  {
    id: "assign-006",
    petId: 2, // Whiskers
    tagId: "tag-010", // Special Diet
    assignedAt: "2024-01-10T09:00:00Z",
    assignedBy: "Sarah Johnson",
    assignedById: 1,
  },
  {
    id: "assign-007",
    petId: 14, // Fluffy
    tagId: "tag-003", // Anxious
    assignedAt: "2024-02-01T08:00:00Z",
    assignedBy: "Mike Davis",
    assignedById: 2,
  },
];

// Ban Records for clients and pets
export const banRecords: BanRecord[] = [
  {
    id: "ban-001",
    entityType: "pet",
    entityId: 5, // Rocky
    isBanned: true,
    reason: "Aggression towards staff",
    notes:
      "Bit a staff member on 2024-01-15. Multiple prior incidents of aggressive behavior. Owner has been notified and agrees with the decision.",
    bannedAt: "2024-01-16T14:00:00Z",
    bannedBy: "Sarah Johnson",
    bannedById: 1,
  },
  {
    id: "ban-002",
    entityType: "client",
    entityId: 30, // Example banned client
    isBanned: true,
    reason: "Unpaid invoices and abusive behavior",
    notes:
      "Client has outstanding balance of $450 and was verbally abusive to staff on multiple occasions. Will not be allowed back until balance is paid and apology is made.",
    bannedAt: "2024-02-10T16:00:00Z",
    bannedBy: "Manager",
    bannedById: 1,
  },
  {
    id: "ban-003",
    entityType: "pet",
    entityId: 10, // Example previously banned pet
    isBanned: false,
    reason: "Excessive barking and disturbing other pets",
    notes:
      "Pet was causing stress to other animals. After training, the pet has improved significantly.",
    bannedAt: "2023-11-01T10:00:00Z",
    bannedBy: "Mike Davis",
    bannedById: 2,
    unbannedAt: "2024-01-05T09:00:00Z",
    unbannedBy: "Sarah Johnson",
    unbannedById: 1,
  },
];

// Mock care instructions data
export const careInstructions: CareInstructions[] = [
  {
    petId: 1,
    feedingSchedule: "8:00 AM, 12:00 PM, 6:00 PM",
    feedingAmount: "1.5 cups per meal",
    medicationList: [],
    groomingSensitivities: "Sensitive to loud noises during grooming",
    behaviorNotes: "Very friendly, loves to play with other dogs",
    lastUpdated: "2024-01-15T10:00:00Z",
    lastUpdatedBy: "Alice Johnson",
    lastUpdatedById: 15,
  },
  {
    petId: 2,
    feedingSchedule: "7:00 AM, 5:00 PM",
    feedingAmount: "1/2 cup per meal",
    medicationList: [
      {
        name: "Flea Prevention",
        dosage: "1 tablet",
        frequency: "Monthly",
        notes: "Give with food",
      },
    ],
    groomingSensitivities: "Prefers gentle brushing",
    behaviorNotes: "Indoor only, prefers quiet spaces",
    lastUpdated: "2024-02-01T11:00:00Z",
    lastUpdatedBy: "Alice Johnson",
    lastUpdatedById: 15,
  },
];
