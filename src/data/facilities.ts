// Available modules for facilities
export const availableModules = [
  {
    id: "booking",
    name: "Booking/Reservation",
    description: "Online booking and reservation management",
    icon: "Calendar",
    basePrice: 29.99,
  },
  {
    id: "scheduling",
    name: "Staff Scheduling",
    description: "Staff shift and schedule management",
    icon: "Users",
    basePrice: 24.99,
  },
  {
    id: "customers",
    name: "Customer Management",
    description: "Client profiles and pet records",
    icon: "UserCheck",
    basePrice: 19.99,
  },
  {
    id: "financial",
    name: "Financial Reporting",
    description: "Revenue, expenses, and financial analytics",
    icon: "CreditCard",
    basePrice: 39.99,
  },
  {
    id: "communication",
    name: "Communication",
    description: "SMS, email, and notification system",
    icon: "MessageSquare",
    basePrice: 14.99,
  },
  {
    id: "training",
    name: "Training/Education",
    description: "Training programs and certifications",
    icon: "GraduationCap",
    basePrice: 34.99,
  },
  {
    id: "grooming",
    name: "Grooming Management",
    description: "Grooming appointments and tracking",
    icon: "Scissors",
    basePrice: 19.99,
  },
  {
    id: "inventory",
    name: "Inventory Management",
    description: "Stock and supplies tracking",
    icon: "Package",
    basePrice: 24.99,
  },
];

// Base subscription prices by plan
export const planPrices: Record<string, number> = {
  Basic: 49.99,
  Starter: 99.99,
  Professional: 199.99,
  Premium: 299.99,
  Enterprise: 499.99,
};

// Custom quoted prices per facility per module (overrides basePrice)
// Key format: `${facilityId}-${moduleId}`
export const moduleQuotedPrices: Record<string, number> = {
  "1-booking": 24.99, // Paws & Play got a discount
  "1-financial": 34.99,
  "3-booking": 39.99, // Furry Friends pays premium
  "3-scheduling": 29.99,
  "8-communication": 9.99, // Canine Care got a deal
};

export const facilities = [
  {
    id: 1,
    name: "Paws & Play Daycare",
    logo: "/yipyy-transparent.png",
    status: "active",
    plan: "Premium",
    dayJoined: "2025-06-15",
    subscriptionEnd: "2026-06-15",
    contact: {
      email: "contact@pawsplay.com",
      phone: "(555) 123-4567",
      website: "https://pawsplay.com",
    },
    owner: {
      name: "John Anderson",
      email: "john.anderson@pawsplay.com",
      phone: "(555) 123-4568",
    },
    limits: {
      locations: 10,
      staff: 50,
      clients: 500,
      pets: -1, // unlimited
    },
    enabledModules: [
      "booking",
      "scheduling",
      "customers",
      "financial",
      "communication",
      "grooming",
    ],
    locationsList: [
      {
        name: "Main Campus",
        address: "123 Main St, Cityville",
        services: ["daycare", "grooming"],
      },
      {
        name: "Branch Office",
        address: "456 Elm St, Cityville",
        services: ["boarding"],
      },
    ],
    clients: [
      {
        person: {
          name: "Alice Johnson",
          email: "alice@example.com",
          phone: "123-456-7890",
        },
        status: "active",
      },
      {
        person: {
          name: "Bob Smith",
          email: "bob@example.com",
          phone: "098-765-4321",
        },
        status: "active",
      },
      {
        person: { name: "Charlie Brown", email: "charlie@example.com" },
        status: "inactive",
      },
    ],
    usersList: [
      {
        person: { name: "Admin User", email: "admin@pawsplay.com" },
        role: "Admin",
      },
      {
        person: { name: "Manager One", email: "manager1@pawsplay.com" },
        role: "Manager",
      },
      {
        person: { name: "Staff One", email: "staff1@pawsplay.com" },
        role: "Staff",
      },
    ],
  },
  {
    id: 2,
    name: "Furry Friends Grooming",
    status: "active",
    plan: "Basic",
    dayJoined: "2025-08-22",
    subscriptionEnd: "2026-08-22",
    contact: {
      email: "info@furryfriends.com",
      phone: "(555) 234-5678",
      website: "https://furryfriends.com",
    },
    owner: {
      name: "Sarah Mitchell",
      email: "sarah@furryfriends.com",
      phone: "(555) 234-5679",
    },
    limits: {
      locations: 3,
      staff: 10,
      clients: 100,
      pets: 250,
    },
    enabledModules: ["booking", "customers", "grooming"],
    locationsList: [
      {
        name: "Downtown Salon",
        address: "789 Oak St, Townburg",
        services: ["grooming", "daycare"],
      },
    ],
    clients: [
      {
        person: {
          name: "Diana Prince",
          email: "diana@example.com",
          phone: "111-222-3333",
        },
        status: "active",
      },
      {
        person: { name: "Eve Adams", email: "eve@example.com" },
        status: "active",
      },
    ],
    usersList: [
      {
        person: { name: "Admin Groom", email: "admin@furryfriends.com" },
        role: "Admin",
      },
      {
        person: { name: "Staff Groom", email: "staff@furryfriends.com" },
        role: "Staff",
      },
    ],
  },
  {
    id: 3,
    name: "Happy Tails Boarding",
    status: "inactive",
    plan: "Enterprise",
    dayJoined: "2025-03-10",
    subscriptionEnd: "2026-03-10",
    contact: {
      email: "hello@happytails.com",
      phone: "(555) 345-6789",
      website: "https://happytails.com",
    },
    owner: {
      name: "Michael Thompson",
      email: "michael@happytails.com",
      phone: "(555) 345-6780",
    },
    limits: {
      locations: -1,
      staff: -1,
      clients: -1,
      pets: -1,
    },
    enabledModules: [
      "booking",
      "scheduling",
      "customers",
      "financial",
      "communication",
      "training",
      "grooming",
      "inventory",
    ],
    locationsList: [
      {
        name: "Main Kennel",
        address: "321 Pine St, Villagetown",
        services: ["boarding", "grooming"],
      },
      {
        name: "East Wing",
        address: "654 Cedar St, Villagetown",
        services: ["boarding"],
      },
      {
        name: "West Annex",
        address: "987 Birch St, Villagetown",
        services: ["daycare"],
      },
    ],
    clients: [
      {
        person: {
          name: "Frank Miller",
          email: "frank@example.com",
          phone: "444-555-6666",
        },
        status: "active",
      },
      {
        person: { name: "Grace Lee", email: "grace@example.com" },
        status: "inactive",
      },
      {
        person: {
          name: "Henry Wilson",
          email: "henry@example.com",
          phone: "777-888-9999",
        },
        status: "active",
      },
    ],
    usersList: [
      {
        person: { name: "Admin Board", email: "admin@happytails.com" },
        role: "Admin",
      },
      {
        person: { name: "Manager Board", email: "manager@happytails.com" },
        role: "Manager",
      },
      {
        person: { name: "Staff Board1", email: "staff1@happytails.com" },
        role: "Staff",
      },
      {
        person: { name: "Staff Board2", email: "staff2@happytails.com" },
        role: "Staff",
      },
    ],
  },
  {
    id: 4,
    name: "Pet Paradise Vet",
    status: "active",
    plan: "Premium",
    dayJoined: "2025-11-05",
    subscriptionEnd: "2026-11-05",
    contact: {
      email: "care@petparadise.com",
      phone: "(555) 456-7890",
      website: "https://petparadise.com",
    },
    owner: {
      name: "Dr. Emily Roberts",
      email: "emily@petparadise.com",
      phone: "(555) 456-7891",
    },
    limits: {
      locations: 10,
      staff: 50,
      clients: 500,
      pets: -1,
    },
    enabledModules: [
      "booking",
      "scheduling",
      "customers",
      "financial",
      "communication",
    ],
    locationsList: [
      {
        name: "Central Clinic",
        address: "147 Maple St, Metro City",
        services: ["vet", "grooming"],
      },
    ],
    clients: [
      {
        person: {
          name: "Ivy Chen",
          email: "ivy@example.com",
          phone: "000-111-2222",
        },
        status: "active",
      },
      {
        person: { name: "Jack Davis", email: "jack@example.com" },
        status: "active",
      },
      {
        person: {
          name: "Karen Taylor",
          email: "karen@example.com",
          phone: "333-444-5555",
        },
        status: "inactive",
      },
    ],
    usersList: [
      {
        person: { name: "Admin Vet", email: "admin@petparadise.com" },
        role: "Admin",
      },
      {
        person: { name: "Manager Vet", email: "manager@petparadise.com" },
        role: "Manager",
      },
      {
        person: { name: "Staff Vet", email: "staff@petparadise.com" },
        role: "Staff",
      },
    ],
  },
  {
    id: 5,
    name: "Whisker Wonderland",
    status: "active",
    plan: "Basic",
    dayJoined: "2025-09-18",
    subscriptionEnd: "2026-09-18",
    contact: {
      email: "meow@whiskerwonderland.com",
      phone: "(555) 567-8901",
      website: "https://whiskerwonderland.com",
    },
    owner: {
      name: "Lisa Chen",
      email: "lisa@whiskerwonderland.com",
      phone: "(555) 567-8902",
    },
    limits: {
      locations: 3,
      staff: 10,
      clients: 100,
      pets: 250,
    },
    enabledModules: ["booking", "customers", "communication"],
    locationsList: [
      {
        name: "Cat Haven",
        address: "258 Spruce St, Catville",
        services: ["daycare", "boarding"],
      },
      {
        name: "Play Area",
        address: "369 Fir St, Catville",
        services: ["daycare"],
      },
    ],
    clients: [
      {
        person: {
          name: "Liam Garcia",
          email: "liam@example.com",
          phone: "666-777-8888",
        },
        status: "active",
      },
      {
        person: { name: "Mia Rodriguez", email: "mia@example.com" },
        status: "active",
      },
    ],
    usersList: [
      {
        person: { name: "Admin Cat", email: "admin@whisker.com" },
        role: "Admin",
      },
      {
        person: { name: "Staff Cat", email: "staff@whisker.com" },
        role: "Staff",
      },
    ],
  },
  {
    id: 6,
    name: "Pet Groomers Paradise",
    status: "active",
    plan: "Premium",
    dayJoined: "2025-07-12",
    subscriptionEnd: "2026-07-12",
    contact: {
      email: "book@petgroomers.com",
      phone: "(555) 678-9012",
      website: "https://petgroomers.com",
    },
    owner: {
      name: "David Park",
      email: "david@petgroomers.com",
      phone: "(555) 678-9013",
    },
    limits: {
      locations: 10,
      staff: 50,
      clients: 500,
      pets: -1,
    },
    enabledModules: [
      "booking",
      "scheduling",
      "customers",
      "financial",
      "grooming",
      "inventory",
    ],
    locationsList: [
      {
        name: "Main Salon",
        address: "741 Elm St, Groomtown",
        services: ["grooming", "daycare"],
      },
      {
        name: "Express Lane",
        address: "852 Oak St, Groomtown",
        services: ["grooming"],
      },
    ],
    clients: [
      {
        person: {
          name: "Nina Patel",
          email: "nina@example.com",
          phone: "999-000-1111",
        },
        status: "active",
      },
      {
        person: {
          name: "Oscar Kim",
          email: "oscar@example.com",
          phone: "222-333-4444",
        },
        status: "active",
      },
      {
        person: { name: "Paula Lee", email: "paula@example.com" },
        status: "inactive",
      },
    ],
    usersList: [
      {
        person: { name: "Admin Groom2", email: "admin@petgroomers.com" },
        role: "Admin",
      },
      {
        person: { name: "Manager Groom", email: "manager@petgroomers.com" },
        role: "Manager",
      },
      {
        person: { name: "Staff Groom2", email: "staff2@petgroomers.com" },
        role: "Staff",
      },
    ],
  },
  {
    id: 7,
    name: "Animal Care Center",
    status: "active",
    plan: "Basic",
    dayJoined: "2025-10-05",
    subscriptionEnd: "2026-10-05",
    contact: {
      email: "support@animalcare.com",
      phone: "(555) 789-0123",
      website: "https://animalcare.com",
    },
    owner: {
      name: "Robert Williams",
      email: "robert@animalcare.com",
      phone: "(555) 789-0124",
    },
    limits: {
      locations: 3,
      staff: 10,
      clients: 100,
      pets: 250,
    },
    enabledModules: ["booking", "customers", "grooming"],
    locationsList: [
      {
        name: "Central Clinic",
        address: "963 Pine St, Careville",
        services: ["vet", "grooming", "boarding"],
      },
    ],
    clients: [
      {
        person: {
          name: "Quinn Taylor",
          email: "quinn@example.com",
          phone: "555-666-7777",
        },
        status: "active",
      },
      {
        person: { name: "Rachel Adams", email: "rachel@example.com" },
        status: "active",
      },
    ],
    usersList: [
      {
        person: { name: "Admin Care", email: "admin@animalcare.com" },
        role: "Admin",
      },
      {
        person: { name: "Staff Care", email: "staff@animalcare.com" },
        role: "Staff",
      },
    ],
  },
  {
    id: 8,
    name: "Feline Friends",
    status: "inactive",
    plan: "Enterprise",
    dayJoined: "2025-02-20",
    subscriptionEnd: "2026-02-20",
    contact: {
      email: "purr@felinefriends.com",
      phone: "(555) 890-1234",
      website: "https://felinefriends.com",
    },
    owner: {
      name: "Jennifer Lee",
      email: "jennifer@felinefriends.com",
      phone: "(555) 890-1235",
    },
    limits: {
      locations: -1,
      staff: -1,
      clients: -1,
      pets: -1,
    },
    enabledModules: [
      "booking",
      "scheduling",
      "customers",
      "financial",
      "communication",
      "training",
      "grooming",
      "inventory",
    ],
    locationsList: [
      {
        name: "Cat Lounge",
        address: "147 Birch St, Feline City",
        services: ["daycare", "boarding"],
      },
      {
        name: "Grooming Room",
        address: "258 Cedar St, Feline City",
        services: ["grooming"],
      },
    ],
    clients: [
      {
        person: {
          name: "Sam Wilson",
          email: "sam@example.com",
          phone: "888-999-0000",
        },
        status: "active",
      },
      {
        person: { name: "Tina Garcia", email: "tina@example.com" },
        status: "inactive",
      },
      {
        person: {
          name: "Uma Patel",
          email: "uma@example.com",
          phone: "111-222-3333",
        },
        status: "active",
      },
    ],
    usersList: [
      {
        person: { name: "Admin Feline", email: "admin@felinefriends.com" },
        role: "Admin",
      },
      {
        person: { name: "Manager Feline", email: "manager@felinefriends.com" },
        role: "Manager",
      },
      {
        person: { name: "Staff Feline1", email: "staff1@felinefriends.com" },
        role: "Staff",
      },
      {
        person: { name: "Staff Feline2", email: "staff2@felinefriends.com" },
        role: "Staff",
      },
    ],
  },
  {
    id: 9,
    name: "Doggy Day Spa",
    status: "active",
    plan: "Premium",
    dayJoined: "2025-12-01",
    subscriptionEnd: "2026-12-01",
    contact: {
      email: "woof@doggyspa.com",
      phone: "(555) 901-2345",
      website: "https://doggyspa.com",
    },
    owner: {
      name: "Jennifer Brown",
      email: "jennifer@doggyspa.com",
      phone: "(555) 901-2346",
    },
    limits: {
      locations: 10,
      staff: 50,
      clients: 500,
      pets: -1,
    },
    enabledModules: [
      "booking",
      "scheduling",
      "customers",
      "financial",
      "communication",
      "grooming",
    ],
    locationsList: [
      {
        name: "Spa Center",
        address: "369 Maple St, Dogtown",
        services: ["grooming", "daycare", "boarding"],
      },
    ],
    clients: [
      {
        person: {
          name: "Victor Chen",
          email: "victor@example.com",
          phone: "444-555-6666",
        },
        status: "active",
      },
      {
        person: { name: "Wendy Liu", email: "wendy@example.com" },
        status: "active",
      },
      {
        person: {
          name: "Xavier Kim",
          email: "xavier@example.com",
          phone: "777-888-9999",
        },
        status: "active",
      },
    ],
    usersList: [
      {
        person: { name: "Admin Spa", email: "admin@doggyspa.com" },
        role: "Admin",
      },
      {
        person: { name: "Manager Spa", email: "manager@doggyspa.com" },
        role: "Manager",
      },
      {
        person: { name: "Staff Spa", email: "staff@doggyspa.com" },
        role: "Staff",
      },
    ],
  },
  {
    id: 10,
    name: "Exotic Pets Hub",
    status: "active",
    plan: "Basic",
    dayJoined: "2025-05-15",
    subscriptionEnd: "2026-05-15",
    contact: {
      email: "exotic@exoticpets.com",
      phone: "(555) 012-3456",
      website: "https://exoticpets.com",
    },
    owner: {
      name: "Carlos Martinez",
      email: "carlos@exoticpets.com",
      phone: "(555) 012-3457",
    },
    limits: {
      locations: 3,
      staff: 10,
      clients: 100,
      pets: 250,
    },
    enabledModules: ["booking", "customers", "inventory"],
    locationsList: [
      {
        name: "Exotic Wing",
        address: "741 Walnut St, Exoticville",
        services: ["boarding", "vet"],
      },
      {
        name: "Reptile Room",
        address: "852 Chestnut St, Exoticville",
        services: ["boarding"],
      },
    ],
    clients: [
      {
        person: {
          name: "Yara Ahmed",
          email: "yara@example.com",
          phone: "000-111-2222",
        },
        status: "active",
      },
      {
        person: { name: "Zoe Martinez", email: "zoe@example.com" },
        status: "active",
      },
    ],
    usersList: [
      {
        person: { name: "Admin Exotic", email: "admin@exoticpets.com" },
        role: "Admin",
      },
      {
        person: { name: "Staff Exotic", email: "staff@exoticpets.com" },
        role: "Staff",
      },
    ],
  },
  {
    id: 11,
    name: "Example Pet Care Facility",
    logo: "/yipyy-transparent.png",
    status: "active",
    smsCredits: {
      monthlyAllowance: 1000,
      used: 168,
      purchased: 200,
      autoReload: true,
      autoReloadThreshold: 10,
    },
    plan: "Basic",
    dayJoined: "2025-01-01",
    subscriptionEnd: "2026-01-01",
    contact: {
      email: "info@examplepetcare.com",
      phone: "(555) 111-2222",
      website: "https://examplepetcare.com",
    },
    owner: {
      name: "Admin Owner",
      email: "owner@examplepetcare.com",
      phone: "(555) 111-2223",
    },
    limits: {
      locations: 3,
      staff: 10,
      clients: 100,
      pets: 250,
    },
    enabledModules: ["booking", "customers", "communication"],
    locationsList: [
      {
        name: "Main Location",
        address: "123 Example St, Example City",
        services: ["daycare", "grooming", "boarding"],
      },
    ],
    clients: [
      {
        person: {
          name: "John Doe",
          email: "john@example.com",
          phone: "123-456-7890",
        },
        status: "active",
      },
      {
        person: {
          name: "Jane Smith",
          email: "jane@example.com",
          phone: "098-765-4321",
        },
        status: "active",
      },
    ],
    usersList: [
      {
        person: { name: "Facility Admin", email: "admin@example.com" },
        role: "Admin",
      },
      {
        person: { name: "Facility Manager", email: "manager@example.com" },
        role: "Manager",
      },
      {
        person: { name: "Facility Staff", email: "staff@example.com" },
        role: "Staff",
      },
    ],
  },
];
