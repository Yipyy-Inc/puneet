/**
 * The second pass of the demo seed: what a walkthrough opens and finds empty.
 * Waivers the clients signed, the forms a facility asks for and the answers
 * it got, the tags staff put on pets and customers, which forms each service
 * requires, and what the floor wrote on the stays that are on now.
 *
 * Every row is found again by an exact name, slug or seed marker, so a
 * second run adds nothing, and teardown.ts removes exactly these rows.
 */
import { SEED_PREFIX } from "./config";

export const RECORD_AUTHOR = "Valérie Lacroix";

export const WAIVERS = [
  {
    name: "Boarding and daycare liability release",
    services: ["boarding", "daycare"],
    category: "liability",
    expiryDays: 365,
    body:
      "I understand that group play and overnight stays carry risks, including scrapes, " +
      "minor bites and illness passed between dogs. I release Paws & Co from liability " +
      "for injuries not caused by its negligence, and authorise the facility to seek " +
      "veterinary care for my pet if I cannot be reached, at my expense.",
    signedBy: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  },
  {
    name: "Grooming consent",
    services: ["grooming"],
    category: "consent",
    expiryDays: null,
    body:
      "I consent to my pet being bathed, brushed, clipped and handled for grooming. If my " +
      "pet's coat is severely matted, I authorise a short shave-down rather than " +
      "de-matting that would cause discomfort. I understand senior or anxious pets may " +
      "need the groom stopped early.",
    signedBy: [2, 4, 6, 8, 12, 14],
  },
  {
    name: "Photo and media release",
    services: ["general"],
    category: "media",
    expiryDays: null,
    body:
      "I allow Paws & Co to take photos and short videos of my pet during visits and to " +
      "share them in report cards and on the facility's social media. I can withdraw this " +
      "consent at any time by telling the front desk.",
    signedBy: [0, 3, 5, 9],
  },
];

export type SeedFormQuestion = {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: { value: string; label: string }[];
};

export const FORMS: {
  slug: string;
  name: string;
  type: string;
  serviceType?: string;
  questions: SeedFormQuestion[];
  /** Client indexes who answered it, with the answers they gave. */
  answers: { client: number; values: Record<string, unknown> }[];
}[] = [
  {
    slug: `${SEED_PREFIX}-form-intake`,
    name: "New client intake",
    type: "intake",
    questions: [
      {
        id: "q-referral",
        type: "select",
        label: "How did you hear about us?",
        required: true,
        options: [
          { value: "friend", label: "A friend" },
          { value: "google", label: "Google" },
          { value: "instagram", label: "Instagram" },
          { value: "vet", label: "Our vet" },
        ],
      },
      {
        id: "q-emergency-name",
        type: "text",
        label: "Emergency contact name",
        required: true,
      },
      {
        id: "q-emergency-phone",
        type: "phone",
        label: "Emergency contact phone",
        required: true,
      },
      {
        id: "q-vet",
        type: "text",
        label: "Veterinary clinic",
        required: false,
      },
    ],
    answers: [
      {
        client: 0,
        values: {
          "q-referral": "friend",
          "q-emergency-name": "Marc Tremblay",
          "q-emergency-phone": "514-555-0142",
          "q-vet": "Clinique vétérinaire du Plateau",
        },
      },
      {
        client: 3,
        values: {
          "q-referral": "google",
          "q-emergency-name": "Sophie Gagnon",
          "q-emergency-phone": "514-555-0167",
          "q-vet": "Hôpital vétérinaire Rive-Sud",
        },
      },
      {
        client: 7,
        values: {
          "q-referral": "vet",
          "q-emergency-name": "Luc Bouchard",
          "q-emergency-phone": "450-555-0119",
        },
      },
    ],
  },
  {
    slug: `${SEED_PREFIX}-form-behaviour`,
    name: "Group play behaviour assessment",
    type: "service",
    serviceType: "daycare",
    questions: [
      {
        id: "q-dog-parks",
        type: "yes_no",
        label: "Does your dog go to dog parks?",
        required: true,
      },
      {
        id: "q-resource",
        type: "yes_no",
        label: "Does your dog guard food or toys?",
        required: true,
      },
      {
        id: "q-bite",
        type: "yes_no",
        label: "Has your dog ever bitten a person or another dog?",
        required: true,
      },
      {
        id: "q-triggers",
        type: "textarea",
        label: "Anything that worries or excites your dog?",
        required: false,
      },
    ],
    answers: [
      {
        client: 1,
        values: {
          "q-dog-parks": "Yes",
          "q-resource": "No",
          "q-bite": "No",
          "q-triggers": "Gets excited by bikes.",
        },
      },
      {
        client: 5,
        values: {
          "q-dog-parks": "Yes",
          "q-resource": "Yes",
          "q-bite": "No",
          "q-triggers": "Guards his ball — best without toys.",
        },
      },
    ],
  },
];

export const FORM_REQUIREMENTS = {
  services: [
    {
      serviceType: "daycare",
      serviceLabel: "Daycare",
      requirements: [
        {
          formSlug: `${SEED_PREFIX}-form-intake`,
          gates: [{ stage: "before_booking", enforcement: "block" }],
        },
        {
          formSlug: `${SEED_PREFIX}-form-behaviour`,
          gates: [{ stage: "before_approval", enforcement: "warn" }],
        },
      ],
    },
    {
      serviceType: "boarding",
      serviceLabel: "Boarding",
      requirements: [
        {
          formSlug: `${SEED_PREFIX}-form-intake`,
          gates: [{ stage: "before_booking", enforcement: "block" }],
        },
      ],
    },
  ],
};

export const TAGS: {
  entity: "pet" | "customer";
  name: string;
  color: string;
  priority: "informational" | "warning" | "critical";
  description: string;
  /** Pet names, or client indexes for a customer tag. */
  on: (string | number)[];
}[] = [
  {
    entity: "pet",
    name: "Senior",
    color: "blue",
    priority: "informational",
    description: "Eight years or older — gentler play group.",
    on: ["Maple", "Biscuit"],
  },
  {
    entity: "pet",
    name: "Reactive on leash",
    color: "amber",
    priority: "warning",
    description: "Walk separately; no nose-to-nose greetings.",
    on: ["Rocco"],
  },
  {
    entity: "pet",
    name: "Escape artist",
    color: "red",
    priority: "critical",
    description: "Double-check gates and kennel latches.",
    on: ["Pixel"],
  },
  {
    entity: "customer",
    name: "VIP",
    color: "violet",
    priority: "informational",
    description: "Long-standing client — offer the first slot.",
    on: [0, 3],
  },
  {
    entity: "customer",
    name: "Late pickups",
    color: "amber",
    priority: "warning",
    description: "Often after 18:00 — confirm the late fee.",
    on: [6],
  },
];

export const SHIFT_NOTES = [
  {
    daysAgo: 1,
    text: "Run 4 latch sticks — use the side door until maintenance comes.",
  },
  {
    daysAgo: 0,
    text: "Maple's evening dose moved to 20:00 per owner. Pill pockets on the top shelf.",
  },
];

export const JOURNAL_NOTES = [
  {
    dayOffset: 0,
    time: "09:10",
    text: "Owner called to check in — told them breakfast went well and the first walk was calm.",
  },
  {
    dayOffset: 1,
    time: "16:40",
    text: "Played nicely in the small group this afternoon; napped after.",
  },
];

export const CARE_NOTE =
  "Needs extra cuddle time at bedtime — settles faster with the blanket from home.";
