/**
 * Default training disciplines.
 *
 * Disciplines are configurable per facility — these defaults are what every
 * new facility ships with. The Settings → Training section will let staff
 * add/edit/disable disciplines; for now this list is the source of truth.
 */
import type { TrainingDiscipline } from "@/types/training";

export const defaultTrainingDisciplines: TrainingDiscipline[] = [
  {
    id: "discipline-obedience",
    name: "Obedience",
    description: "Foundational manners and command work.",
    color: "#6366f1", // indigo
    isActive: true,
  },
  {
    id: "discipline-agility",
    name: "Agility",
    description: "Course running, jumps, weaves, contacts.",
    color: "#f97316", // orange
    isActive: true,
  },
  {
    id: "discipline-protection",
    name: "Protection Sports",
    description: "IGP/IPO, French Ring, PSA, personal protection.",
    color: "#ef4444", // red
    isActive: true,
  },
  {
    id: "discipline-nosework",
    name: "Nosework",
    description: "Odor discrimination and search work.",
    color: "#a855f7", // purple
    isActive: true,
  },
  {
    id: "discipline-puppy",
    name: "Puppy Training",
    description: "Socialization and early-life manners.",
    color: "#0ea5e9", // sky
    isActive: true,
  },
  {
    id: "discipline-behavior",
    name: "Behavior Modification",
    description: "Reactivity, fear, aggression rehabilitation.",
    color: "#14b8a6", // teal
    isActive: true,
  },
  {
    id: "discipline-rally",
    name: "Rally",
    description: "Rally obedience — judged station-based runs.",
    color: "#eab308", // yellow
    isActive: true,
  },
  {
    id: "discipline-scent",
    name: "Scent Work",
    description: "AKC Scent Work / NACSW competition prep.",
    color: "#10b981", // emerald
    isActive: true,
  },
];
