/**
 * Training Module Configuration
 * 
 * Defines the structure for training course types (class catalog)
 * that facilities can configure and customize.
 */

export interface TrainingCourseType {
  id: string;
  name: string; // Custom class name
  description: string; // Custom description
  defaultWeeks: number; // Default number of weeks
  ageRange: {
    minWeeks: number; // Minimum age in weeks
    maxWeeks?: number; // Maximum age in weeks (optional)
  };
  requiredVaccines: string[]; // Array of required vaccine names
  prerequisites: string[]; // Array of prerequisite course type IDs
  isActive: boolean; // Whether this course type is currently offered
  createdAt: string;
  updatedAt: string;
}

/**
 * Default system course types (fully editable by facilities)
 */
export const defaultTrainingCourseTypes: TrainingCourseType[] = [
  {
    id: "basic-obedience",
    name: "Basic Obedience / Beginner Manners",
    description: "Teaches foundational commands like sit, stay, down, and polite leash walking.",
    defaultWeeks: 6,
    ageRange: {
      minWeeks: 16, // 16+ weeks
    },
    requiredVaccines: ["Rabies", "DHPP", "Bordetella"],
    prerequisites: [],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "intermediate-obedience",
    name: "Intermediate / Level 2 Obedience",
    description: "Adds distractions, distance, and duration to previously learned commands.",
    defaultWeeks: 4,
    ageRange: {
      minWeeks: 20,
    },
    requiredVaccines: ["Rabies", "DHPP", "Bordetella"],
    prerequisites: ["basic-obedience"], // Requires Basic Obedience completion
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "advanced-obedience",
    name: "Advanced Obedience",
    description: "Focuses on high-level reliability in varied environments.",
    defaultWeeks: 6,
    ageRange: {
      minWeeks: 24,
    },
    requiredVaccines: ["Rabies", "DHPP", "Bordetella"],
    prerequisites: ["intermediate-obedience"], // Requires Intermediate + Assessment
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "reactive-rover",
    name: "Reactive Rover Recovery",
    description: "For leash-reactive dogs. Controlled environment training.",
    defaultWeeks: 8,
    ageRange: {
      minWeeks: 16,
    },
    requiredVaccines: ["Rabies", "DHPP", "Bordetella"],
    prerequisites: [], // Private assessment required (handled separately)
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "puppy-preschool",
    name: "Puppy Preschool",
    description: "Socialization and early manners for 8-16 week olds.",
    defaultWeeks: 4,
    ageRange: {
      minWeeks: 8,
      maxWeeks: 16,
    },
    requiredVaccines: ["DHPP"], // First round of vaccines
    prerequisites: [],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cgc-prep",
    name: "Canine Good Citizen Prep",
    description: "Preparation for CGC certification test.",
    defaultWeeks: 6,
    ageRange: {
      minWeeks: 20,
    },
    requiredVaccines: ["Rabies", "DHPP", "Bordetella"],
    prerequisites: ["basic-obedience"], // Requires Basic Obedience
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Available vaccine options for course configuration
 */
export const AVAILABLE_VACCINES = [
  "Rabies",
  "DHPP",
  "Bordetella",
  "Canine Influenza",
  "Lyme",
  "Leptospirosis",
];
