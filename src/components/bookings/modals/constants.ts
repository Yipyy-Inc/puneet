import { Sun, Bed, Scissors, GraduationCap, CheckCircle } from "lucide-react";
import { type Step } from "@/components/ui/stepper";

export const SERVICE_CATEGORIES = [
  {
    id: "daycare",
    image: "/services/daycare.jpg",
    name: "Daycare",
    icon: Sun,
    description: "Full or half day supervised care",
    basePrice: 35,
  },
  {
    id: "boarding",
    image: "/services/boarding.jpg",
    name: "Boarding",
    icon: Bed,
    description: "Overnight stays with full care",
    basePrice: 45,
  },
  {
    id: "grooming",
    image: "/services/grooming.jpg",
    name: "Grooming",
    icon: Scissors,
    description: "Bath, grooming, and styling services",
    basePrice: 40,
  },
  {
    id: "training",
    image: "/services/training.jpg",
    name: "Training",
    icon: GraduationCap,
    description: "Obedience and specialized training",
    basePrice: 85,
  },
  {
    id: "evaluation",
    image: "/services/evaluation.jpg",
    name: "Pet Evaluation",
    icon: CheckCircle,
    description: "Assessment to ensure pet readiness",
    basePrice: 0,
  },
];

export const GROOMING_STYLES = [
  { id: "bath_brush", name: "Bath & Brush", price: 40 },
  { id: "full_groom", name: "Full Groom", price: 65 },
  { id: "puppy_groom", name: "Puppy Groom", price: 35 },
  { id: "hand_stripping", name: "Hand Stripping", price: 95 },
  { id: "deshedding", name: "De-shedding Treatment", price: 55 },
];

export const GROOMING_ADDONS = [
  { id: "nail_trim", name: "Nail Trim", price: 15 },
  { id: "teeth_brush", name: "Teeth Brushing", price: 10 },
  { id: "ear_clean", name: "Ear Cleaning", price: 12 },
  { id: "flea_treatment", name: "Flea Treatment", price: 25 },
  { id: "medicated_bath", name: "Medicated Bath", price: 20 },
  { id: "paw_treatment", name: "Paw Pad Treatment", price: 15 },
];

export const TRAINING_TYPES = [
  { id: "basic_obedience", name: "Basic Obedience", price: 250, sessions: 6 },
  {
    id: "advanced_obedience",
    name: "Advanced Obedience",
    price: 350,
    sessions: 8,
  },
  { id: "private_session", name: "Private Session", price: 85, sessions: 1 },
  { id: "puppy_training", name: "Puppy Training", price: 200, sessions: 4 },
  {
    id: "behavior_modification",
    name: "Behavior Modification",
    price: 150,
    sessions: 1,
  },
  { id: "agility", name: "Agility Training", price: 300, sessions: 6 },
];

export const DAYCARE_TYPES = [
  { id: "full_day", name: "Full Day", price: 35, hours: "8+" },
  { id: "half_day", name: "Half Day", price: 22, hours: "up to 5" },
];

export const BOARDING_TYPES = [
  { id: "standard", name: "Standard Boarding", price: 45 },
  { id: "luxury", name: "Luxury Suite", price: 75 },
  { id: "vip", name: "VIP Suite", price: 100 },
];

export const STEPS: Step[] = [
  { id: "service", title: "Service", description: "Choose service" },
  { id: "client-pet", title: "Client & Pet", description: "Select or create" },
  { id: "details", title: "Details", description: "Service info" },
  { id: "confirm", title: "Confirm", description: "Review booking" },
];

export const DAYCARE_SUB_STEPS = [
  { id: 0, title: "Schedule", description: "Select dates and times" },
  { id: 1, title: "Room Assignment", description: "Assign to room" },
  { id: 2, title: "Add-ons", description: "Add-on services" },
  { id: 3, title: "Feeding & Medication", description: "Care instructions" },
];

export const BOARDING_SUB_STEPS = [
  { id: 0, title: "Schedule", description: "Select dates" },
  { id: 1, title: "Room Type", description: "Choose room" },
  { id: 2, title: "Add-ons", description: "Add-on services" },
  { id: 3, title: "Feeding & Medication", description: "Care instructions" },
];

export const EVALUATION_SUB_STEPS = [
  { id: 0, title: "Schedule", description: "Select date and time slot" },
  { id: 1, title: "Staff", description: "Assign evaluator" },
  { id: 2, title: "Room", description: "Choose room" },
];
