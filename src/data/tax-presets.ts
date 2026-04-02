// ── Tax presets by country/province ───────────────────────────────────────────

export interface TaxPreset {
  name: string;
  rate: number;
  appliesTo: "all" | "services_only" | "products_only";
}

export interface RegionPreset {
  label: string;
  code: string;
  taxes: TaxPreset[];
}

export interface CountryPreset {
  label: string;
  code: string;
  regions: RegionPreset[];
}

// ── Canada (all 13 provinces/territories) ────────────────────────────────────

const CANADA: CountryPreset = {
  label: "Canada",
  code: "CA",
  regions: [
    {
      label: "Alberta",
      code: "AB",
      taxes: [{ name: "GST", rate: 0.05, appliesTo: "all" }],
    },
    {
      label: "British Columbia",
      code: "BC",
      taxes: [
        { name: "GST", rate: 0.05, appliesTo: "all" },
        { name: "PST", rate: 0.07, appliesTo: "all" },
      ],
    },
    {
      label: "Manitoba",
      code: "MB",
      taxes: [
        { name: "GST", rate: 0.05, appliesTo: "all" },
        { name: "PST", rate: 0.07, appliesTo: "all" },
      ],
    },
    {
      label: "New Brunswick",
      code: "NB",
      taxes: [{ name: "HST", rate: 0.15, appliesTo: "all" }],
    },
    {
      label: "Newfoundland & Labrador",
      code: "NL",
      taxes: [{ name: "HST", rate: 0.15, appliesTo: "all" }],
    },
    {
      label: "Nova Scotia",
      code: "NS",
      taxes: [{ name: "HST", rate: 0.15, appliesTo: "all" }],
    },
    {
      label: "Ontario",
      code: "ON",
      taxes: [{ name: "HST", rate: 0.13, appliesTo: "all" }],
    },
    {
      label: "Prince Edward Island",
      code: "PE",
      taxes: [{ name: "HST", rate: 0.15, appliesTo: "all" }],
    },
    {
      label: "Quebec",
      code: "QC",
      taxes: [
        { name: "GST", rate: 0.05, appliesTo: "all" },
        { name: "QST", rate: 0.09975, appliesTo: "all" },
      ],
    },
    {
      label: "Saskatchewan",
      code: "SK",
      taxes: [
        { name: "GST", rate: 0.05, appliesTo: "all" },
        { name: "PST", rate: 0.06, appliesTo: "all" },
      ],
    },
    {
      label: "Northwest Territories",
      code: "NT",
      taxes: [{ name: "GST", rate: 0.05, appliesTo: "all" }],
    },
    {
      label: "Nunavut",
      code: "NU",
      taxes: [{ name: "GST", rate: 0.05, appliesTo: "all" }],
    },
    {
      label: "Yukon",
      code: "YT",
      taxes: [{ name: "GST", rate: 0.05, appliesTo: "all" }],
    },
  ],
};

// ── United States (all 50 states + DC — state-level base rates) ──────────────
// Note: Many states have additional city/county taxes. These are base state rates only.

const US: CountryPreset = {
  label: "United States",
  code: "US",
  regions: [
    {
      label: "Alabama",
      code: "AL",
      taxes: [{ name: "Sales Tax", rate: 0.04, appliesTo: "all" }],
    },
    { label: "Alaska", code: "AK", taxes: [] }, // No state tax, local only
    {
      label: "Arizona",
      code: "AZ",
      taxes: [{ name: "Sales Tax", rate: 0.056, appliesTo: "all" }],
    },
    {
      label: "Arkansas",
      code: "AR",
      taxes: [{ name: "Sales Tax", rate: 0.065, appliesTo: "all" }],
    },
    {
      label: "California",
      code: "CA",
      taxes: [{ name: "Sales Tax", rate: 0.0725, appliesTo: "all" }],
    },
    {
      label: "Colorado",
      code: "CO",
      taxes: [{ name: "Sales Tax", rate: 0.029, appliesTo: "all" }],
    },
    {
      label: "Connecticut",
      code: "CT",
      taxes: [{ name: "Sales Tax", rate: 0.0635, appliesTo: "all" }],
    },
    { label: "Delaware", code: "DE", taxes: [] }, // No sales tax
    {
      label: "Florida",
      code: "FL",
      taxes: [{ name: "Sales Tax", rate: 0.06, appliesTo: "all" }],
    },
    {
      label: "Georgia",
      code: "GA",
      taxes: [{ name: "Sales Tax", rate: 0.04, appliesTo: "all" }],
    },
    {
      label: "Hawaii",
      code: "HI",
      taxes: [{ name: "GET", rate: 0.04, appliesTo: "all" }],
    },
    {
      label: "Idaho",
      code: "ID",
      taxes: [{ name: "Sales Tax", rate: 0.06, appliesTo: "all" }],
    },
    {
      label: "Illinois",
      code: "IL",
      taxes: [{ name: "Sales Tax", rate: 0.0625, appliesTo: "all" }],
    },
    {
      label: "Indiana",
      code: "IN",
      taxes: [{ name: "Sales Tax", rate: 0.07, appliesTo: "all" }],
    },
    {
      label: "Iowa",
      code: "IA",
      taxes: [{ name: "Sales Tax", rate: 0.06, appliesTo: "all" }],
    },
    {
      label: "Kansas",
      code: "KS",
      taxes: [{ name: "Sales Tax", rate: 0.065, appliesTo: "all" }],
    },
    {
      label: "Kentucky",
      code: "KY",
      taxes: [{ name: "Sales Tax", rate: 0.06, appliesTo: "all" }],
    },
    {
      label: "Louisiana",
      code: "LA",
      taxes: [{ name: "Sales Tax", rate: 0.0445, appliesTo: "all" }],
    },
    {
      label: "Maine",
      code: "ME",
      taxes: [{ name: "Sales Tax", rate: 0.055, appliesTo: "all" }],
    },
    {
      label: "Maryland",
      code: "MD",
      taxes: [{ name: "Sales Tax", rate: 0.06, appliesTo: "all" }],
    },
    {
      label: "Massachusetts",
      code: "MA",
      taxes: [{ name: "Sales Tax", rate: 0.0625, appliesTo: "all" }],
    },
    {
      label: "Michigan",
      code: "MI",
      taxes: [{ name: "Sales Tax", rate: 0.06, appliesTo: "all" }],
    },
    {
      label: "Minnesota",
      code: "MN",
      taxes: [{ name: "Sales Tax", rate: 0.06875, appliesTo: "all" }],
    },
    {
      label: "Mississippi",
      code: "MS",
      taxes: [{ name: "Sales Tax", rate: 0.07, appliesTo: "all" }],
    },
    {
      label: "Missouri",
      code: "MO",
      taxes: [{ name: "Sales Tax", rate: 0.04225, appliesTo: "all" }],
    },
    { label: "Montana", code: "MT", taxes: [] }, // No sales tax
    {
      label: "Nebraska",
      code: "NE",
      taxes: [{ name: "Sales Tax", rate: 0.055, appliesTo: "all" }],
    },
    {
      label: "Nevada",
      code: "NV",
      taxes: [{ name: "Sales Tax", rate: 0.0685, appliesTo: "all" }],
    },
    { label: "New Hampshire", code: "NH", taxes: [] }, // No sales tax
    {
      label: "New Jersey",
      code: "NJ",
      taxes: [{ name: "Sales Tax", rate: 0.06625, appliesTo: "all" }],
    },
    {
      label: "New Mexico",
      code: "NM",
      taxes: [{ name: "GRT", rate: 0.05125, appliesTo: "all" }],
    },
    {
      label: "New York",
      code: "NY",
      taxes: [{ name: "Sales Tax", rate: 0.04, appliesTo: "all" }],
    },
    {
      label: "North Carolina",
      code: "NC",
      taxes: [{ name: "Sales Tax", rate: 0.0475, appliesTo: "all" }],
    },
    {
      label: "North Dakota",
      code: "ND",
      taxes: [{ name: "Sales Tax", rate: 0.05, appliesTo: "all" }],
    },
    {
      label: "Ohio",
      code: "OH",
      taxes: [{ name: "Sales Tax", rate: 0.0575, appliesTo: "all" }],
    },
    {
      label: "Oklahoma",
      code: "OK",
      taxes: [{ name: "Sales Tax", rate: 0.045, appliesTo: "all" }],
    },
    { label: "Oregon", code: "OR", taxes: [] }, // No sales tax
    {
      label: "Pennsylvania",
      code: "PA",
      taxes: [{ name: "Sales Tax", rate: 0.06, appliesTo: "all" }],
    },
    {
      label: "Rhode Island",
      code: "RI",
      taxes: [{ name: "Sales Tax", rate: 0.07, appliesTo: "all" }],
    },
    {
      label: "South Carolina",
      code: "SC",
      taxes: [{ name: "Sales Tax", rate: 0.06, appliesTo: "all" }],
    },
    {
      label: "South Dakota",
      code: "SD",
      taxes: [{ name: "Sales Tax", rate: 0.042, appliesTo: "all" }],
    },
    {
      label: "Tennessee",
      code: "TN",
      taxes: [{ name: "Sales Tax", rate: 0.07, appliesTo: "all" }],
    },
    {
      label: "Texas",
      code: "TX",
      taxes: [{ name: "Sales Tax", rate: 0.0625, appliesTo: "all" }],
    },
    {
      label: "Utah",
      code: "UT",
      taxes: [{ name: "Sales Tax", rate: 0.0485, appliesTo: "all" }],
    },
    {
      label: "Vermont",
      code: "VT",
      taxes: [{ name: "Sales Tax", rate: 0.06, appliesTo: "all" }],
    },
    {
      label: "Virginia",
      code: "VA",
      taxes: [{ name: "Sales Tax", rate: 0.043, appliesTo: "all" }],
    },
    {
      label: "Washington",
      code: "WA",
      taxes: [{ name: "Sales Tax", rate: 0.065, appliesTo: "all" }],
    },
    {
      label: "Washington DC",
      code: "DC",
      taxes: [{ name: "Sales Tax", rate: 0.06, appliesTo: "all" }],
    },
    {
      label: "West Virginia",
      code: "WV",
      taxes: [{ name: "Sales Tax", rate: 0.06, appliesTo: "all" }],
    },
    {
      label: "Wisconsin",
      code: "WI",
      taxes: [{ name: "Sales Tax", rate: 0.05, appliesTo: "all" }],
    },
    {
      label: "Wyoming",
      code: "WY",
      taxes: [{ name: "Sales Tax", rate: 0.04, appliesTo: "all" }],
    },
  ],
};

// ── International ────────────────────────────────────────────────────────────

const INTERNATIONAL: CountryPreset[] = [
  {
    label: "United Kingdom",
    code: "GB",
    regions: [
      {
        label: "Standard",
        code: "GB",
        taxes: [{ name: "VAT", rate: 0.2, appliesTo: "all" }],
      },
      {
        label: "Reduced",
        code: "GB-R",
        taxes: [{ name: "VAT (Reduced)", rate: 0.05, appliesTo: "all" }],
      },
    ],
  },
  {
    label: "Australia",
    code: "AU",
    regions: [
      {
        label: "Standard",
        code: "AU",
        taxes: [{ name: "GST", rate: 0.1, appliesTo: "all" }],
      },
    ],
  },
  {
    label: "New Zealand",
    code: "NZ",
    regions: [
      {
        label: "Standard",
        code: "NZ",
        taxes: [{ name: "GST", rate: 0.15, appliesTo: "all" }],
      },
    ],
  },
  {
    label: "France",
    code: "FR",
    regions: [
      {
        label: "Standard",
        code: "FR",
        taxes: [{ name: "TVA", rate: 0.2, appliesTo: "all" }],
      },
      {
        label: "Reduced",
        code: "FR-R",
        taxes: [{ name: "TVA (Reduced)", rate: 0.055, appliesTo: "all" }],
      },
    ],
  },
  {
    label: "Germany",
    code: "DE",
    regions: [
      {
        label: "Standard",
        code: "DE",
        taxes: [{ name: "MwSt", rate: 0.19, appliesTo: "all" }],
      },
      {
        label: "Reduced",
        code: "DE-R",
        taxes: [{ name: "MwSt (Reduced)", rate: 0.07, appliesTo: "all" }],
      },
    ],
  },
  {
    label: "Italy",
    code: "IT",
    regions: [
      {
        label: "Standard",
        code: "IT",
        taxes: [{ name: "IVA", rate: 0.22, appliesTo: "all" }],
      },
    ],
  },
  {
    label: "Spain",
    code: "ES",
    regions: [
      {
        label: "Standard",
        code: "ES",
        taxes: [{ name: "IVA", rate: 0.21, appliesTo: "all" }],
      },
    ],
  },
  {
    label: "Netherlands",
    code: "NL",
    regions: [
      {
        label: "Standard",
        code: "NL",
        taxes: [{ name: "BTW", rate: 0.21, appliesTo: "all" }],
      },
    ],
  },
  {
    label: "Belgium",
    code: "BE",
    regions: [
      {
        label: "Standard",
        code: "BE",
        taxes: [{ name: "BTW/TVA", rate: 0.21, appliesTo: "all" }],
      },
    ],
  },
  {
    label: "Switzerland",
    code: "CH",
    regions: [
      {
        label: "Standard",
        code: "CH",
        taxes: [{ name: "MWST", rate: 0.081, appliesTo: "all" }],
      },
    ],
  },
  {
    label: "Ireland",
    code: "IE",
    regions: [
      {
        label: "Standard",
        code: "IE",
        taxes: [{ name: "VAT", rate: 0.23, appliesTo: "all" }],
      },
    ],
  },
  {
    label: "Portugal",
    code: "PT",
    regions: [
      {
        label: "Standard",
        code: "PT",
        taxes: [{ name: "IVA", rate: 0.23, appliesTo: "all" }],
      },
    ],
  },
  {
    label: "Sweden",
    code: "SE",
    regions: [
      {
        label: "Standard",
        code: "SE",
        taxes: [{ name: "Moms", rate: 0.25, appliesTo: "all" }],
      },
    ],
  },
  {
    label: "Norway",
    code: "NO",
    regions: [
      {
        label: "Standard",
        code: "NO",
        taxes: [{ name: "MVA", rate: 0.25, appliesTo: "all" }],
      },
    ],
  },
  {
    label: "Denmark",
    code: "DK",
    regions: [
      {
        label: "Standard",
        code: "DK",
        taxes: [{ name: "Moms", rate: 0.25, appliesTo: "all" }],
      },
    ],
  },
  {
    label: "Japan",
    code: "JP",
    regions: [
      {
        label: "Standard",
        code: "JP",
        taxes: [{ name: "Consumption Tax", rate: 0.1, appliesTo: "all" }],
      },
    ],
  },
  {
    label: "South Korea",
    code: "KR",
    regions: [
      {
        label: "Standard",
        code: "KR",
        taxes: [{ name: "VAT", rate: 0.1, appliesTo: "all" }],
      },
    ],
  },
  {
    label: "India",
    code: "IN",
    regions: [
      {
        label: "Standard (18%)",
        code: "IN-18",
        taxes: [{ name: "GST", rate: 0.18, appliesTo: "all" }],
      },
      {
        label: "Reduced (12%)",
        code: "IN-12",
        taxes: [{ name: "GST", rate: 0.12, appliesTo: "all" }],
      },
      {
        label: "Low (5%)",
        code: "IN-5",
        taxes: [{ name: "GST", rate: 0.05, appliesTo: "all" }],
      },
    ],
  },
  {
    label: "Brazil",
    code: "BR",
    regions: [
      {
        label: "Standard",
        code: "BR",
        taxes: [{ name: "ICMS", rate: 0.18, appliesTo: "all" }],
      },
    ],
  },
  {
    label: "Mexico",
    code: "MX",
    regions: [
      {
        label: "Standard",
        code: "MX",
        taxes: [{ name: "IVA", rate: 0.16, appliesTo: "all" }],
      },
    ],
  },
  {
    label: "UAE",
    code: "AE",
    regions: [
      {
        label: "Standard",
        code: "AE",
        taxes: [{ name: "VAT", rate: 0.05, appliesTo: "all" }],
      },
    ],
  },
  {
    label: "Saudi Arabia",
    code: "SA",
    regions: [
      {
        label: "Standard",
        code: "SA",
        taxes: [{ name: "VAT", rate: 0.15, appliesTo: "all" }],
      },
    ],
  },
  {
    label: "Singapore",
    code: "SG",
    regions: [
      {
        label: "Standard",
        code: "SG",
        taxes: [{ name: "GST", rate: 0.09, appliesTo: "all" }],
      },
    ],
  },
  {
    label: "Other",
    code: "OTHER",
    regions: [{ label: "Custom", code: "CUSTOM", taxes: [] }],
  },
];

export const TAX_PRESETS: CountryPreset[] = [CANADA, US, ...INTERNATIONAL];

export function getPreset(
  countryCode: string,
  regionCode: string,
): TaxPreset[] | null {
  const country = TAX_PRESETS.find((c) => c.code === countryCode);
  if (!country) return null;
  const region = country.regions.find((r) => r.code === regionCode);
  return region?.taxes ?? null;
}
