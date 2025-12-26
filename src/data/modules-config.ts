export interface ModuleConfig {
  clientFacingName: string;
  staffFacingName: string;
  slogan: string;
  description: string;
  bannerImage?: string;
  basePrice: number;
  settings: {
    evaluation: {
      enabled: boolean;
      optional?: boolean;
      internalName: string;
      customerName: string;
      description: string;
      price: number;
      duration: "half-day" | "full-day" | "custom";
      customHours?: number;
      taxSettings: {
        taxable: boolean;
        taxRate?: number;
      };
    };
  };
  status: {
    disabled: boolean;
    reason?: string;
  };
}

export const daycareConfig: ModuleConfig = {
  clientFacingName: "Happy Paws Daycare",
  staffFacingName: "Daycare Management",
  slogan: "Where Every Paw Feels at Home",
  description:
    "Professional daycare services with supervised play, socialization, and personalized care for your furry friends.",
  bannerImage: "/services/daycare.jpg",
  basePrice: 35,
  settings: {
    evaluation: {
      enabled: true,
      optional: false,
      internalName: "Daycare Evaluation",
      customerName: "Pet Evaluation",
      description:
        "A brief assessment to ensure your pet is ready for daycare.",
      price: 0,
      duration: "half-day",
      taxSettings: {
        taxable: false,
      },
    },
  },
  status: {
    disabled: false,
  },
};

// Boarding Module Configuration

export const boardingConfig: ModuleConfig = {
  clientFacingName: "Cozy Kennels Boarding",
  staffFacingName: "Boarding Management",
  slogan: "Your Pet's Home Away From Home",
  description:
    "Comfortable overnight boarding with personalized care, exercise, and attention for your beloved pets.",
  bannerImage: "/services/boarding.jpg",
  basePrice: 45,
  settings: {
    evaluation: {
      enabled: false,
      internalName: "Boarding Evaluation",
      customerName: "Pet Evaluation",
      description:
        "A brief assessment to ensure your pet is ready for boarding.",
      price: 0,
      duration: "half-day",
      taxSettings: {
        taxable: false,
      },
    },
  },
  status: {
    disabled: false,
  },
};

// Grooming Module Configuration

export const groomingConfig: ModuleConfig = {
  clientFacingName: "Pawfect Grooming",
  staffFacingName: "Grooming Services",
  slogan: "Pamper Your Pet to Perfection",
  description:
    "Professional grooming services including bathing, trimming, and styling to keep your pet looking and feeling great.",
  basePrice: 50,
  settings: {
    evaluation: {
      enabled: false,
      internalName: "Grooming Evaluation",
      customerName: "Pet Evaluation",
      description:
        "A brief assessment to ensure your pet is ready for grooming.",
      price: 0,
      duration: "half-day",
      taxSettings: {
        taxable: false,
      },
    },
  },
  status: {
    disabled: true,
    reason: "not implemented yet",
  },
};

// Training Module Configuration

export const trainingConfig: ModuleConfig = {
  clientFacingName: "Obedience Training Academy",
  staffFacingName: "Training Programs",
  slogan: "Train Smart, Love More",
  description:
    "Expert training programs to teach obedience, tricks, and behavior modification for well-behaved pets.",
  basePrice: 60,
  settings: {
    evaluation: {
      enabled: false,
      internalName: "Training Evaluation",
      customerName: "Pet Evaluation",
      description:
        "A brief assessment to ensure your pet is ready for training.",
      price: 0,
      duration: "half-day",
      taxSettings: {
        taxable: false,
      },
    },
  },
  status: {
    disabled: true,
    reason: "not implemented yet",
  },
};
