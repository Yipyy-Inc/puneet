import type { StaffMember } from "@/types/staff";

export const staffMembers: StaffMember[] = [
  {
    id: "staff-001",
    name: "Mike Chen",
    role: "Senior Evaluator",
    skills: ["evaluation", "daycare", "boarding"],
    isActive: true,
  },
  {
    id: "staff-002",
    name: "Emily Davis",
    role: "Evaluation Specialist",
    skills: ["evaluation", "training", "daycare"],
    isActive: true,
  },
  {
    id: "staff-003",
    name: "David Wilson",
    role: "Grooming Lead",
    skills: ["grooming", "daycare"],
    isActive: true,
  },
  {
    id: "staff-004",
    name: "Lisa Rodriguez",
    role: "Training Coordinator",
    skills: ["training", "evaluation", "boarding"],
    isActive: true,
  },
  {
    id: "staff-005",
    name: "Tom Anderson",
    role: "Daycare Supervisor",
    skills: ["daycare", "boarding"],
    isActive: true,
  },
  {
    id: "staff-006",
    name: "Manager One",
    role: "Facility Manager",
    skills: [
      "evaluation",
      "administration",
      "daycare",
      "boarding",
      "grooming",
      "training",
    ],
    isActive: true,
  },
  {
    id: "staff-007",
    name: "Admin User",
    role: "Administrator",
    skills: ["administration"],
    isActive: true,
  },
];
