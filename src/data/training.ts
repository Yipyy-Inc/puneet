// Training module mock data

export type TrainingClassStatus = "scheduled" | "in-progress" | "completed" | "cancelled";
export type EnrollmentStatus = "enrolled" | "completed" | "dropped" | "waitlisted";
export type SkillLevel = "beginner" | "intermediate" | "advanced";
export type ClassType = "group" | "private";

export interface Trainer {
  [key: string]: unknown;
  id: string;
  name: string;
  email: string;
  phone: string;
  photoUrl?: string;
  specializations: string[];
  certifications: string[];
  yearsExperience: number;
  status: "active" | "inactive" | "on-leave";
  bio: string;
  rating: number;
  totalClasses: number;
  hireDate: string;
}

export interface TrainingClass {
  [key: string]: unknown;
  id: string;
  name: string;
  description: string;
  trainerId: string;
  trainerName: string;
  classType: ClassType;
  skillLevel: SkillLevel;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  capacity: number;
  enrolledCount: number;
  price: number;
  status: "active" | "inactive";
  location: string;
  startDate: string;
  endDate: string;
  totalSessions: number;
}

export interface TrainingSession {
  [key: string]: unknown;
  id: string;
  classId: string;
  className: string;
  trainerId: string;
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: TrainingClassStatus;
  attendees: string[]; // enrollment IDs
  notes: string;
}

export interface Enrollment {
  [key: string]: unknown;
  id: string;
  classId: string;
  className: string;
  petId: number;
  petName: string;
  petBreed: string;
  ownerId: number;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  enrollmentDate: string;
  status: EnrollmentStatus;
  sessionsAttended: number;
  totalSessions: number;
  packageId?: string;
  notes: string;
}

export interface TrainerNote {
  [key: string]: unknown;
  id: string;
  enrollmentId: string;
  petId: number;
  petName: string;
  classId: string;
  className: string;
  sessionId?: string;
  trainerId: string;
  trainerName: string;
  date: string;
  note: string;
  category: "behavior" | "progress" | "concern" | "achievement" | "general";
  isPrivate: boolean; // If true, only visible to staff
}

export interface ProgressRecord {
  [key: string]: unknown;
  id: string;
  enrollmentId: string;
  petId: number;
  petName: string;
  petBreed: string;
  classId: string;
  className: string;
  trainerId: string;
  trainerName: string;
  skills: SkillProgress[];
  overallProgress: number; // 0-100
  lastUpdated: string;
  notes: string;
}

export interface SkillProgress {
  skillName: string;
  level: number; // 0-100
  status: "not-started" | "in-progress" | "mastered";
  lastPracticed?: string;
}

export interface TrainingPackage {
  [key: string]: unknown;
  id: string;
  name: string;
  description: string;
  classType: ClassType;
  skillLevel: SkillLevel;
  sessions: number;
  price: number;
  validityDays: number;
  isActive: boolean;
  popular?: boolean;
  includes: string[];
}

// Mock Data

export const trainers: Trainer[] = [
  {
    id: "trainer-001",
    name: "Marcus Chen",
    email: "marcus.chen@doggieville.com",
    phone: "(514) 555-0201",
    photoUrl: "/trainers/marcus.jpg",
    specializations: ["Obedience", "Agility", "Puppy Training"],
    certifications: ["CPDT-KA", "AKC CGC Evaluator"],
    yearsExperience: 8,
    status: "active",
    bio: "Marcus has been training dogs for over 8 years with a focus on positive reinforcement techniques.",
    rating: 4.9,
    totalClasses: 342,
    hireDate: "2018-03-15",
  },
  {
    id: "trainer-002",
    name: "Sophie Martinez",
    email: "sophie.martinez@doggieville.com",
    phone: "(514) 555-0202",
    photoUrl: "/trainers/sophie.jpg",
    specializations: ["Behavior Modification", "Reactive Dog Training", "Fear-Free Training"],
    certifications: ["CAAB", "CPDT-KA", "Fear-Free Certified"],
    yearsExperience: 12,
    status: "active",
    bio: "Sophie specializes in working with anxious and reactive dogs using science-based methods.",
    rating: 4.95,
    totalClasses: 520,
    hireDate: "2015-06-01",
  },
  {
    id: "trainer-003",
    name: "Jake Wilson",
    email: "jake.wilson@doggieville.com",
    phone: "(514) 555-0203",
    photoUrl: "/trainers/jake.jpg",
    specializations: ["Puppy Socialization", "Basic Obedience", "Trick Training"],
    certifications: ["CPDT-KA"],
    yearsExperience: 4,
    status: "active",
    bio: "Jake loves working with puppies and helping them build a strong foundation for life.",
    rating: 4.8,
    totalClasses: 156,
    hireDate: "2021-01-10",
  },
  {
    id: "trainer-004",
    name: "Elena Kowalski",
    email: "elena.kowalski@doggieville.com",
    phone: "(514) 555-0204",
    photoUrl: "/trainers/elena.jpg",
    specializations: ["Agility", "Rally", "Competition Training"],
    certifications: ["CPDT-KA", "AKC Agility Judge"],
    yearsExperience: 15,
    status: "active",
    bio: "Elena is a competitive agility handler with multiple national titles.",
    rating: 4.85,
    totalClasses: 680,
    hireDate: "2012-09-20",
  },
];

export const trainingClasses: TrainingClass[] = [
  {
    id: "class-001",
    name: "Puppy Kindergarten",
    description: "Basic socialization and foundation training for puppies 8-16 weeks old.",
    trainerId: "trainer-003",
    trainerName: "Jake Wilson",
    classType: "group",
    skillLevel: "beginner",
    dayOfWeek: 6, // Saturday
    startTime: "10:00",
    endTime: "11:00",
    duration: 60,
    capacity: 8,
    enrolledCount: 6,
    price: 180,
    status: "active",
    location: "Training Room A",
    startDate: "2024-03-02",
    endDate: "2024-04-06",
    totalSessions: 6,
  },
  {
    id: "class-002",
    name: "Basic Obedience",
    description: "Essential commands and manners for dogs of all ages. Covers sit, stay, come, heel, and more.",
    trainerId: "trainer-001",
    trainerName: "Marcus Chen",
    classType: "group",
    skillLevel: "beginner",
    dayOfWeek: 2, // Tuesday
    startTime: "18:00",
    endTime: "19:00",
    duration: 60,
    capacity: 10,
    enrolledCount: 8,
    price: 220,
    status: "active",
    location: "Training Room B",
    startDate: "2024-03-05",
    endDate: "2024-04-23",
    totalSessions: 8,
  },
  {
    id: "class-003",
    name: "Advanced Obedience",
    description: "Off-leash reliability, distance commands, and complex behaviors.",
    trainerId: "trainer-001",
    trainerName: "Marcus Chen",
    classType: "group",
    skillLevel: "advanced",
    dayOfWeek: 4, // Thursday
    startTime: "18:00",
    endTime: "19:30",
    duration: 90,
    capacity: 8,
    enrolledCount: 5,
    price: 280,
    status: "active",
    location: "Outdoor Training Yard",
    startDate: "2024-03-07",
    endDate: "2024-04-25",
    totalSessions: 8,
  },
  {
    id: "class-004",
    name: "Reactive Dog Workshop",
    description: "Help your reactive dog learn to stay calm around triggers.",
    trainerId: "trainer-002",
    trainerName: "Sophie Martinez",
    classType: "group",
    skillLevel: "intermediate",
    dayOfWeek: 0, // Sunday
    startTime: "09:00",
    endTime: "10:30",
    duration: 90,
    capacity: 4,
    enrolledCount: 4,
    price: 350,
    status: "active",
    location: "Private Training Room",
    startDate: "2024-03-03",
    endDate: "2024-04-21",
    totalSessions: 8,
  },
  {
    id: "class-005",
    name: "Agility Foundations",
    description: "Introduction to agility equipment and handling skills.",
    trainerId: "trainer-004",
    trainerName: "Elena Kowalski",
    classType: "group",
    skillLevel: "beginner",
    dayOfWeek: 6, // Saturday
    startTime: "14:00",
    endTime: "15:30",
    duration: 90,
    capacity: 6,
    enrolledCount: 6,
    price: 320,
    status: "active",
    location: "Agility Course",
    startDate: "2024-03-02",
    endDate: "2024-04-20",
    totalSessions: 8,
  },
  {
    id: "class-006",
    name: "Competition Agility",
    description: "Advanced agility training for competition-ready teams.",
    trainerId: "trainer-004",
    trainerName: "Elena Kowalski",
    classType: "group",
    skillLevel: "advanced",
    dayOfWeek: 0, // Sunday
    startTime: "11:00",
    endTime: "12:30",
    duration: 90,
    capacity: 6,
    enrolledCount: 4,
    price: 380,
    status: "active",
    location: "Agility Course",
    startDate: "2024-03-03",
    endDate: "2024-04-21",
    totalSessions: 8,
  },
  {
    id: "class-007",
    name: "Trick Training",
    description: "Fun tricks to impress your friends and mentally stimulate your dog.",
    trainerId: "trainer-003",
    trainerName: "Jake Wilson",
    classType: "group",
    skillLevel: "intermediate",
    dayOfWeek: 3, // Wednesday
    startTime: "19:00",
    endTime: "20:00",
    duration: 60,
    capacity: 8,
    enrolledCount: 7,
    price: 180,
    status: "active",
    location: "Training Room A",
    startDate: "2024-03-06",
    endDate: "2024-04-10",
    totalSessions: 6,
  },
  {
    id: "class-008",
    name: "Canine Good Citizen Prep",
    description: "Prepare for the AKC Canine Good Citizen test.",
    trainerId: "trainer-001",
    trainerName: "Marcus Chen",
    classType: "group",
    skillLevel: "intermediate",
    dayOfWeek: 6, // Saturday
    startTime: "12:00",
    endTime: "13:00",
    duration: 60,
    capacity: 10,
    enrolledCount: 9,
    price: 200,
    status: "active",
    location: "Training Room B",
    startDate: "2024-03-02",
    endDate: "2024-04-06",
    totalSessions: 6,
  },
];

const getDateString = (daysOffset: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split("T")[0];
};

export const trainingSessions: TrainingSession[] = [
  {
    id: "session-001",
    classId: "class-001",
    className: "Puppy Kindergarten",
    trainerId: "trainer-003",
    trainerName: "Jake Wilson",
    date: getDateString(2),
    startTime: "10:00",
    endTime: "11:00",
    status: "scheduled",
    attendees: ["enroll-001", "enroll-002", "enroll-003"],
    notes: "",
  },
  {
    id: "session-002",
    classId: "class-002",
    className: "Basic Obedience",
    trainerId: "trainer-001",
    trainerName: "Marcus Chen",
    date: getDateString(0),
    startTime: "18:00",
    endTime: "19:00",
    status: "scheduled",
    attendees: ["enroll-004", "enroll-005", "enroll-006", "enroll-007"],
    notes: "",
  },
  {
    id: "session-003",
    classId: "class-005",
    className: "Agility Foundations",
    trainerId: "trainer-004",
    trainerName: "Elena Kowalski",
    date: getDateString(3),
    startTime: "14:00",
    endTime: "15:30",
    status: "scheduled",
    attendees: ["enroll-008", "enroll-009", "enroll-010"],
    notes: "",
  },
];

export const enrollments: Enrollment[] = [
  {
    id: "enroll-001",
    classId: "class-001",
    className: "Puppy Kindergarten",
    petId: 13,
    petName: "Bella",
    petBreed: "French Bulldog",
    ownerId: 28,
    ownerName: "Emily Davis",
    ownerPhone: "(514) 555-0103",
    ownerEmail: "emily.davis@email.com",
    enrollmentDate: "2024-02-25",
    status: "enrolled",
    sessionsAttended: 3,
    totalSessions: 6,
    notes: "First time in training. Very enthusiastic!",
  },
  {
    id: "enroll-002",
    classId: "class-001",
    className: "Puppy Kindergarten",
    petId: 20,
    petName: "Mochi",
    petBreed: "Shiba Inu",
    ownerId: 35,
    ownerName: "Kevin Park",
    ownerPhone: "(514) 555-0110",
    ownerEmail: "kevin.park@email.com",
    enrollmentDate: "2024-02-26",
    status: "enrolled",
    sessionsAttended: 3,
    totalSessions: 6,
    notes: "Can be stubborn but responds well to treats.",
  },
  {
    id: "enroll-003",
    classId: "class-001",
    className: "Puppy Kindergarten",
    petId: 21,
    petName: "Scout",
    petBreed: "Australian Shepherd",
    ownerId: 36,
    ownerName: "Amanda Foster",
    ownerPhone: "(514) 555-0111",
    ownerEmail: "amanda.foster@email.com",
    enrollmentDate: "2024-02-27",
    status: "enrolled",
    sessionsAttended: 2,
    totalSessions: 6,
    notes: "Very smart puppy, picks up quickly.",
  },
  {
    id: "enroll-004",
    classId: "class-002",
    className: "Basic Obedience",
    petId: 1,
    petName: "Buddy",
    petBreed: "Golden Retriever",
    ownerId: 15,
    ownerName: "John Smith",
    ownerPhone: "(514) 555-0101",
    ownerEmail: "john.smith@email.com",
    enrollmentDate: "2024-02-28",
    status: "enrolled",
    sessionsAttended: 4,
    totalSessions: 8,
    notes: "Excellent with other dogs.",
  },
  {
    id: "enroll-005",
    classId: "class-002",
    className: "Basic Obedience",
    petId: 3,
    petName: "Max",
    petBreed: "Labrador Retriever",
    ownerId: 16,
    ownerName: "Sarah Johnson",
    ownerPhone: "(514) 555-0102",
    ownerEmail: "sarah.johnson@email.com",
    enrollmentDate: "2024-02-28",
    status: "enrolled",
    sessionsAttended: 4,
    totalSessions: 8,
    notes: "Needs extra work on 'stay' command.",
  },
  {
    id: "enroll-006",
    classId: "class-002",
    className: "Basic Obedience",
    petId: 14,
    petName: "Charlie",
    petBreed: "Beagle",
    ownerId: 29,
    ownerName: "Michael Brown",
    ownerPhone: "(514) 555-0104",
    ownerEmail: "michael.brown@email.com",
    enrollmentDate: "2024-03-01",
    status: "enrolled",
    sessionsAttended: 3,
    totalSessions: 8,
    notes: "Easily distracted by scents.",
  },
  {
    id: "enroll-007",
    classId: "class-002",
    className: "Basic Obedience",
    petId: 15,
    petName: "Sadie",
    petBreed: "Border Collie",
    ownerId: 30,
    ownerName: "Jennifer Lee",
    ownerPhone: "(514) 555-0112",
    ownerEmail: "jennifer.lee@email.com",
    enrollmentDate: "2024-03-01",
    status: "enrolled",
    sessionsAttended: 4,
    totalSessions: 8,
    notes: "Very eager to learn, excellent focus.",
  },
  {
    id: "enroll-008",
    classId: "class-005",
    className: "Agility Foundations",
    petId: 15,
    petName: "Sadie",
    petBreed: "Border Collie",
    ownerId: 30,
    ownerName: "Jennifer Lee",
    ownerPhone: "(514) 555-0112",
    ownerEmail: "jennifer.lee@email.com",
    enrollmentDate: "2024-02-25",
    status: "enrolled",
    sessionsAttended: 5,
    totalSessions: 8,
    notes: "Natural at agility, already cleared jump sequences.",
  },
  {
    id: "enroll-009",
    classId: "class-005",
    className: "Agility Foundations",
    petId: 21,
    petName: "Scout",
    petBreed: "Australian Shepherd",
    ownerId: 36,
    ownerName: "Amanda Foster",
    ownerPhone: "(514) 555-0111",
    ownerEmail: "amanda.foster@email.com",
    enrollmentDate: "2024-02-26",
    status: "enrolled",
    sessionsAttended: 5,
    totalSessions: 8,
    notes: "Great with weave poles.",
  },
  {
    id: "enroll-010",
    classId: "class-005",
    className: "Agility Foundations",
    petId: 1,
    petName: "Buddy",
    petBreed: "Golden Retriever",
    ownerId: 15,
    ownerName: "John Smith",
    ownerPhone: "(514) 555-0101",
    ownerEmail: "john.smith@email.com",
    enrollmentDate: "2024-02-27",
    status: "enrolled",
    sessionsAttended: 4,
    totalSessions: 8,
    notes: "Working on tunnel confidence.",
  },
  {
    id: "enroll-011",
    classId: "class-004",
    className: "Reactive Dog Workshop",
    petId: 22,
    petName: "Rex",
    petBreed: "German Shepherd",
    ownerId: 37,
    ownerName: "David Miller",
    ownerPhone: "(514) 555-0113",
    ownerEmail: "david.miller@email.com",
    enrollmentDate: "2024-02-20",
    status: "enrolled",
    sessionsAttended: 5,
    totalSessions: 8,
    notes: "Reactive to other dogs on leash. Making good progress.",
  },
  {
    id: "enroll-012",
    classId: "class-003",
    className: "Advanced Obedience",
    petId: 15,
    petName: "Sadie",
    petBreed: "Border Collie",
    ownerId: 30,
    ownerName: "Jennifer Lee",
    ownerPhone: "(514) 555-0112",
    ownerEmail: "jennifer.lee@email.com",
    enrollmentDate: "2024-02-28",
    status: "enrolled",
    sessionsAttended: 3,
    totalSessions: 8,
    notes: "Working on off-leash recall.",
  },
];

export const trainerNotes: TrainerNote[] = [
  {
    id: "note-001",
    enrollmentId: "enroll-001",
    petId: 13,
    petName: "Bella",
    classId: "class-001",
    className: "Puppy Kindergarten",
    trainerId: "trainer-003",
    trainerName: "Jake Wilson",
    date: "2024-03-09",
    note: "Bella had a breakthrough today! She successfully completed the 'sit' and 'down' commands without treats. Her focus has improved dramatically.",
    category: "achievement",
    isPrivate: false,
  },
  {
    id: "note-002",
    enrollmentId: "enroll-001",
    petId: 13,
    petName: "Bella",
    classId: "class-001",
    className: "Puppy Kindergarten",
    trainerId: "trainer-003",
    trainerName: "Jake Wilson",
    date: "2024-03-02",
    note: "First session. Bella was nervous initially but warmed up quickly. Recommend owner practice handling exercises at home.",
    category: "progress",
    isPrivate: false,
  },
  {
    id: "note-003",
    enrollmentId: "enroll-004",
    petId: 1,
    petName: "Buddy",
    classId: "class-002",
    className: "Basic Obedience",
    trainerId: "trainer-001",
    trainerName: "Marcus Chen",
    date: "2024-03-12",
    note: "Buddy is doing excellent with recall. His 'come' command is nearly perfect even with distractions. Ready to progress to off-leash work.",
    category: "achievement",
    isPrivate: false,
  },
  {
    id: "note-004",
    enrollmentId: "enroll-005",
    petId: 3,
    petName: "Max",
    classId: "class-002",
    className: "Basic Obedience",
    trainerId: "trainer-001",
    trainerName: "Marcus Chen",
    date: "2024-03-12",
    note: "Max struggles with the 'stay' command beyond 10 seconds. Recommending shorter duration with higher reward frequency.",
    category: "concern",
    isPrivate: false,
  },
  {
    id: "note-005",
    enrollmentId: "enroll-008",
    petId: 15,
    petName: "Sadie",
    classId: "class-005",
    className: "Agility Foundations",
    trainerId: "trainer-004",
    trainerName: "Elena Kowalski",
    date: "2024-03-09",
    note: "Sadie cleared the full jump sequence at competition height today. Exceptional natural ability. Should consider advanced agility class.",
    category: "achievement",
    isPrivate: false,
  },
  {
    id: "note-006",
    enrollmentId: "enroll-011",
    petId: 22,
    petName: "Rex",
    classId: "class-004",
    className: "Reactive Dog Workshop",
    trainerId: "trainer-002",
    trainerName: "Sophie Martinez",
    date: "2024-03-10",
    note: "Rex maintained calm at 15 feet from trigger dog today - huge improvement from initial 40+ feet threshold. Owner is being consistent with homework.",
    category: "progress",
    isPrivate: false,
  },
  {
    id: "note-007",
    enrollmentId: "enroll-011",
    petId: 22,
    petName: "Rex",
    classId: "class-004",
    className: "Reactive Dog Workshop",
    trainerId: "trainer-002",
    trainerName: "Sophie Martinez",
    date: "2024-03-03",
    note: "Private note: Rex has a history of bite incidents. Extra caution needed during close-proximity exercises.",
    category: "behavior",
    isPrivate: true,
  },
  {
    id: "note-008",
    enrollmentId: "enroll-006",
    petId: 14,
    petName: "Charlie",
    classId: "class-002",
    className: "Basic Obedience",
    trainerId: "trainer-001",
    trainerName: "Marcus Chen",
    date: "2024-03-05",
    note: "Charlie's nose gets him in trouble! Working on 'leave it' command. Owner should practice with food distractions at home.",
    category: "behavior",
    isPrivate: false,
  },
];

export const progressRecords: ProgressRecord[] = [
  {
    id: "progress-001",
    enrollmentId: "enroll-001",
    petId: 13,
    petName: "Bella",
    petBreed: "French Bulldog",
    classId: "class-001",
    className: "Puppy Kindergarten",
    trainerId: "trainer-003",
    trainerName: "Jake Wilson",
    skills: [
      { skillName: "Sit", level: 80, status: "in-progress", lastPracticed: "2024-03-09" },
      { skillName: "Down", level: 70, status: "in-progress", lastPracticed: "2024-03-09" },
      { skillName: "Stay", level: 40, status: "in-progress", lastPracticed: "2024-03-09" },
      { skillName: "Come", level: 50, status: "in-progress", lastPracticed: "2024-03-09" },
      { skillName: "Socialization", level: 75, status: "in-progress", lastPracticed: "2024-03-09" },
      { skillName: "Handling", level: 60, status: "in-progress", lastPracticed: "2024-03-09" },
    ],
    overallProgress: 63,
    lastUpdated: "2024-03-09",
    notes: "Bella is making great progress. Focus on stay and come commands.",
  },
  {
    id: "progress-002",
    enrollmentId: "enroll-004",
    petId: 1,
    petName: "Buddy",
    petBreed: "Golden Retriever",
    classId: "class-002",
    className: "Basic Obedience",
    trainerId: "trainer-001",
    trainerName: "Marcus Chen",
    skills: [
      { skillName: "Sit", level: 100, status: "mastered", lastPracticed: "2024-03-12" },
      { skillName: "Down", level: 100, status: "mastered", lastPracticed: "2024-03-12" },
      { skillName: "Stay", level: 85, status: "in-progress", lastPracticed: "2024-03-12" },
      { skillName: "Come", level: 95, status: "in-progress", lastPracticed: "2024-03-12" },
      { skillName: "Heel", level: 70, status: "in-progress", lastPracticed: "2024-03-12" },
      { skillName: "Leave It", level: 80, status: "in-progress", lastPracticed: "2024-03-12" },
    ],
    overallProgress: 88,
    lastUpdated: "2024-03-12",
    notes: "Buddy is an excellent student. Ready for advanced class soon.",
  },
  {
    id: "progress-003",
    enrollmentId: "enroll-005",
    petId: 3,
    petName: "Max",
    petBreed: "Labrador Retriever",
    classId: "class-002",
    className: "Basic Obedience",
    trainerId: "trainer-001",
    trainerName: "Marcus Chen",
    skills: [
      { skillName: "Sit", level: 90, status: "in-progress", lastPracticed: "2024-03-12" },
      { skillName: "Down", level: 85, status: "in-progress", lastPracticed: "2024-03-12" },
      { skillName: "Stay", level: 45, status: "in-progress", lastPracticed: "2024-03-12" },
      { skillName: "Come", level: 75, status: "in-progress", lastPracticed: "2024-03-12" },
      { skillName: "Heel", level: 60, status: "in-progress", lastPracticed: "2024-03-12" },
      { skillName: "Leave It", level: 55, status: "in-progress", lastPracticed: "2024-03-12" },
    ],
    overallProgress: 68,
    lastUpdated: "2024-03-12",
    notes: "Max needs extra work on duration commands. Practice daily.",
  },
  {
    id: "progress-004",
    enrollmentId: "enroll-008",
    petId: 15,
    petName: "Sadie",
    petBreed: "Border Collie",
    classId: "class-005",
    className: "Agility Foundations",
    trainerId: "trainer-004",
    trainerName: "Elena Kowalski",
    skills: [
      { skillName: "Jumps", level: 95, status: "in-progress", lastPracticed: "2024-03-09" },
      { skillName: "Tunnels", level: 90, status: "in-progress", lastPracticed: "2024-03-09" },
      { skillName: "Weave Poles", level: 85, status: "in-progress", lastPracticed: "2024-03-09" },
      { skillName: "A-Frame", level: 80, status: "in-progress", lastPracticed: "2024-03-09" },
      { skillName: "Dog Walk", level: 75, status: "in-progress", lastPracticed: "2024-03-09" },
      { skillName: "Teeter", level: 70, status: "in-progress", lastPracticed: "2024-03-09" },
      { skillName: "Handling Cues", level: 85, status: "in-progress", lastPracticed: "2024-03-09" },
    ],
    overallProgress: 83,
    lastUpdated: "2024-03-09",
    notes: "Sadie is a natural! Ready for competition-level training.",
  },
  {
    id: "progress-005",
    enrollmentId: "enroll-011",
    petId: 22,
    petName: "Rex",
    petBreed: "German Shepherd",
    classId: "class-004",
    className: "Reactive Dog Workshop",
    trainerId: "trainer-002",
    trainerName: "Sophie Martinez",
    skills: [
      { skillName: "Threshold Distance", level: 65, status: "in-progress", lastPracticed: "2024-03-10" },
      { skillName: "Look at Me", level: 80, status: "in-progress", lastPracticed: "2024-03-10" },
      { skillName: "Emergency U-Turn", level: 90, status: "in-progress", lastPracticed: "2024-03-10" },
      { skillName: "Calm Settle", level: 55, status: "in-progress", lastPracticed: "2024-03-10" },
      { skillName: "Trigger Desensitization", level: 50, status: "in-progress", lastPracticed: "2024-03-10" },
    ],
    overallProgress: 68,
    lastUpdated: "2024-03-10",
    notes: "Significant improvement. Continue daily practice and management.",
  },
  {
    id: "progress-006",
    enrollmentId: "enroll-002",
    petId: 20,
    petName: "Mochi",
    petBreed: "Shiba Inu",
    classId: "class-001",
    className: "Puppy Kindergarten",
    trainerId: "trainer-003",
    trainerName: "Jake Wilson",
    skills: [
      { skillName: "Sit", level: 60, status: "in-progress", lastPracticed: "2024-03-09" },
      { skillName: "Down", level: 45, status: "in-progress", lastPracticed: "2024-03-09" },
      { skillName: "Stay", level: 30, status: "in-progress", lastPracticed: "2024-03-09" },
      { skillName: "Come", level: 35, status: "in-progress", lastPracticed: "2024-03-09" },
      { skillName: "Socialization", level: 55, status: "in-progress", lastPracticed: "2024-03-09" },
      { skillName: "Handling", level: 50, status: "in-progress", lastPracticed: "2024-03-09" },
    ],
    overallProgress: 46,
    lastUpdated: "2024-03-09",
    notes: "Typical Shiba independence. High-value treats recommended.",
  },
];

export const trainingPackages: TrainingPackage[] = [
  {
    id: "pkg-001",
    name: "Puppy Starter Pack",
    description: "Perfect for new puppy owners. Includes socialization and basic commands.",
    classType: "group",
    skillLevel: "beginner",
    sessions: 6,
    price: 160,
    validityDays: 90,
    isActive: true,
    popular: true,
    includes: [
      "6 group training sessions",
      "Puppy socialization",
      "Basic commands (sit, down, stay)",
      "Handling exercises",
      "Training manual",
    ],
  },
  {
    id: "pkg-002",
    name: "Basic Obedience Package",
    description: "Comprehensive obedience training for dogs of all ages.",
    classType: "group",
    skillLevel: "beginner",
    sessions: 8,
    price: 200,
    validityDays: 120,
    isActive: true,
    popular: true,
    includes: [
      "8 group training sessions",
      "Essential commands",
      "Loose leash walking",
      "Impulse control",
      "Training manual",
      "Progress report",
    ],
  },
  {
    id: "pkg-003",
    name: "Advanced Training Package",
    description: "Take your dog's skills to the next level with off-leash reliability.",
    classType: "group",
    skillLevel: "advanced",
    sessions: 8,
    price: 260,
    validityDays: 120,
    isActive: true,
    includes: [
      "8 advanced training sessions",
      "Off-leash training",
      "Distance commands",
      "Distraction proofing",
      "CGC preparation",
      "Certificate of completion",
    ],
  },
  {
    id: "pkg-004",
    name: "Agility Starter Package",
    description: "Introduction to agility training for active dogs.",
    classType: "group",
    skillLevel: "beginner",
    sessions: 8,
    price: 300,
    validityDays: 120,
    isActive: true,
    includes: [
      "8 agility foundation sessions",
      "Equipment introduction",
      "Basic handling skills",
      "Jump training",
      "Tunnel work",
      "Weave pole introduction",
    ],
  },
  {
    id: "pkg-005",
    name: "Reactive Dog Program",
    description: "Specialized program for dogs with reactivity issues.",
    classType: "group",
    skillLevel: "intermediate",
    sessions: 8,
    price: 320,
    validityDays: 120,
    isActive: true,
    includes: [
      "8 small group sessions (max 4 dogs)",
      "Behavior modification techniques",
      "Desensitization training",
      "Counter-conditioning",
      "Management strategies",
      "Owner education",
      "Follow-up support",
    ],
  },
  {
    id: "pkg-006",
    name: "Trick Training Bundle",
    description: "Fun tricks to entertain and mentally stimulate your dog.",
    classType: "group",
    skillLevel: "intermediate",
    sessions: 6,
    price: 160,
    validityDays: 90,
    isActive: true,
    includes: [
      "6 trick training sessions",
      "10+ tricks taught",
      "Trick training guide",
      "Video tutorials access",
    ],
  },
  {
    id: "pkg-007",
    name: "CGC Test Prep",
    description: "Prepare for the AKC Canine Good Citizen evaluation.",
    classType: "group",
    skillLevel: "intermediate",
    sessions: 6,
    price: 180,
    validityDays: 90,
    isActive: true,
    includes: [
      "6 preparation sessions",
      "All 10 CGC test items covered",
      "Practice evaluations",
      "CGC test fee included",
      "Certificate upon passing",
    ],
  },
  {
    id: "pkg-008",
    name: "Competition Agility Package",
    description: "For teams ready to compete in agility trials.",
    classType: "group",
    skillLevel: "advanced",
    sessions: 8,
    price: 360,
    validityDays: 120,
    isActive: true,
    includes: [
      "8 competition-level sessions",
      "Course analysis",
      "Handling techniques",
      "Speed and accuracy drills",
      "Mock trials",
      "Competition entry support",
    ],
  },
];

// Helper functions

export function getActiveClasses(): TrainingClass[] {
  return trainingClasses.filter((c) => c.status === "active");
}

export function getClassesByTrainer(trainerId: string): TrainingClass[] {
  return trainingClasses.filter((c) => c.trainerId === trainerId);
}

export function getClassesByDay(dayOfWeek: number): TrainingClass[] {
  return trainingClasses.filter((c) => c.dayOfWeek === dayOfWeek && c.status === "active");
}

export function getEnrollmentsByClass(classId: string): Enrollment[] {
  return enrollments.filter((e) => e.classId === classId);
}

export function getEnrollmentsByPet(petId: number): Enrollment[] {
  return enrollments.filter((e) => e.petId === petId);
}

export function getNotesByEnrollment(enrollmentId: string): TrainerNote[] {
  return trainerNotes.filter((n) => n.enrollmentId === enrollmentId);
}

export function getNotesByPet(petId: number): TrainerNote[] {
  return trainerNotes.filter((n) => n.petId === petId);
}

export function getProgressByEnrollment(enrollmentId: string): ProgressRecord | undefined {
  return progressRecords.find((p) => p.enrollmentId === enrollmentId);
}

export function getProgressByPet(petId: number): ProgressRecord[] {
  return progressRecords.filter((p) => p.petId === petId);
}

export function getActiveTrainers(): Trainer[] {
  return trainers.filter((t) => t.status === "active");
}

export function getActivePackages(): TrainingPackage[] {
  return trainingPackages.filter((p) => p.isActive);
}

export function getTrainingStats() {
  const activeClasses = getActiveClasses();
  const totalEnrollments = enrollments.filter((e) => e.status === "enrolled").length;
  const totalCapacity = activeClasses.reduce((sum, c) => sum + c.capacity, 0);
  const currentEnrolled = activeClasses.reduce((sum, c) => sum + c.enrolledCount, 0);

  return {
    activeClasses: activeClasses.length,
    totalEnrollments,
    activeTrainers: getActiveTrainers().length,
    capacityUtilization: Math.round((currentEnrolled / totalCapacity) * 100),
    upcomingSessions: trainingSessions.filter((s) => s.status === "scheduled").length,
    packagesAvailable: getActivePackages().length,
  };
}

export function getUpcomingSessions(days: number = 7): TrainingSession[] {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);

  return trainingSessions.filter((s) => {
    const sessionDate = new Date(s.date);
    return sessionDate >= today && sessionDate <= futureDate && s.status === "scheduled";
  });
}

export const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
