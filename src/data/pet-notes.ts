// Mock notes that live on a pet or client profile and pull through to every
// appointment for that pet/client. See PetNote in @/types/pet for the model.

import type { PetNote } from "@/types/pet";

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

export const petNotes: PetNote[] = [
  // Buddy (petId: 1) — Golden Retriever, in-progress today on appt-001
  {
    id: "pn-001",
    scope: "pet",
    petId: 1,
    text: "Prefers lavender-free shampoo. Owner is very particular about ear cleaning — gentle pressure only.",
    pinned: true,
    createdBy: "Jessica Martinez",
    createdAt: daysAgo(180),
  },
  {
    id: "pn-002",
    scope: "pet",
    petId: 1,
    text: "Loves frozen peanut butter Kong during nail trims. Keeps him still.",
    pinned: false,
    createdBy: "Front Desk",
    createdAt: daysAgo(95),
  },
  {
    id: "pn-003",
    scope: "pet",
    petId: 1,
    text: "Last summer cut was a #5 on body, scissor finish on face. Owner liked it.",
    pinned: false,
    createdBy: "Jessica Martinez",
    createdAt: daysAgo(42),
  },

  // Bella (petId: 13) — French Bulldog, appt-002
  {
    id: "pn-010",
    scope: "pet",
    petId: 13,
    text: "First spa day was a huge success — take lots of photos, owner shares them on Instagram.",
    pinned: true,
    createdBy: "Amy Chen",
    createdAt: daysAgo(28),
  },
  {
    id: "pn-011",
    scope: "pet",
    petId: 13,
    text: "Don't use the high-velocity dryer — startles her. Stand dryer on low only.",
    pinned: false,
    createdBy: "Amy Chen",
    createdAt: daysAgo(28),
  },

  // Charlie (petId: 14) — Beagle, appt-003
  {
    id: "pn-020",
    scope: "pet",
    petId: 14,
    text: "Ears are sensitive — clean with cotton round, never a Q-tip. Owner asked us to stop using flushes.",
    pinned: true,
    createdBy: "Marcus Thompson",
    createdAt: daysAgo(120),
  },

  // Client-level notes
  {
    id: "pn-100",
    scope: "client",
    clientId: 15,
    text: "Pays cash, always tips 20%. Likes a phone call when pet is ready instead of SMS.",
    pinned: true,
    createdBy: "Front Desk",
    createdAt: daysAgo(220),
  },
  {
    id: "pn-101",
    scope: "client",
    clientId: 28,
    text: "Email-only contact during work hours (9–5). Will not answer phone.",
    pinned: false,
    createdBy: "Front Desk",
    createdAt: daysAgo(60),
  },
];
