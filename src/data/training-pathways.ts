/**
 * Training Pathways — the multi-program journey a facility lays out for its
 * clients. A pathway is an ordered sequence of training programs ("course
 * types"), each marked required or optional, that answers the customer's
 * question: "What is next after this class?"
 *
 * The shape mirrors the disciplines catalog — facility staff manage the list
 * from Settings → Training; consumers (My Pets pathway journey, Training
 * Classes catalog badge) read from the same shared query cache.
 */

/** Single rung on a pathway — references a training program (TrainingPackage)
 *  by id with a required/optional flag and an optional teaser describing what
 *  the dog will be ready for after completing this step. */
export interface TrainingPathwayStep {
  /** TrainingPackage.id */
  programId: string;
  /** When false, the customer can skip this step in the journey display —
   *  it stays visible but renders muted with an "Optional" tag. */
  required: boolean;
  /** Short blurb shown under the step name: "Ready for off-leash work" or
   *  "Foundation for CGC testing." Optional. */
  description?: string;
}

export interface TrainingPathway {
  id: string;
  name: string;
  /** Optional one-line description shown on the settings list and as a
   *  subtitle on the customer pathway journey card. */
  description?: string;
  steps: TrainingPathwayStep[];
  /** Hidden pathways stay in the data for history but don't render to
   *  customers. */
  isActive: boolean;
}

/** Seed pathways — each references existing TrainingPackage ids from
 *  `data/training.ts`. The ids must stay in sync; if a program is renamed
 *  or removed, the settings UI surfaces an "unknown program" placeholder so
 *  staff can repair the pathway. */
export const defaultTrainingPathways: TrainingPathway[] = [
  {
    id: "pathway-obedience",
    name: "Obedience Track",
    description:
      "From puppy fundamentals through Canine Good Citizen certification — the classic four-step journey.",
    isActive: true,
    steps: [
      {
        programId: "pkg-001",
        required: true,
        description: "Socialization, name response, basic handling.",
      },
      {
        programId: "pkg-002",
        required: true,
        description: "Sit, stay, come, leash manners — the core toolkit.",
      },
      {
        programId: "pkg-003",
        required: true,
        description: "Off-leash reliability and distraction proofing.",
      },
      {
        programId: "pkg-007",
        required: false,
        description: "Ready for the AKC Canine Good Citizen test.",
      },
    ],
  },
  {
    id: "pathway-agility",
    name: "Agility Journey",
    description: "Introduce, refine, compete — the agility pipeline.",
    isActive: true,
    steps: [
      {
        programId: "pkg-004",
        required: true,
        description: "Equipment introduction at a low, calm pace.",
      },
      {
        programId: "pkg-008",
        required: false,
        description: "Course strategy and trial preparation.",
      },
    ],
  },
];
