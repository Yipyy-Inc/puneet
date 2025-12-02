// Client documents and agreements
export interface ClientDocument {
  id: string;
  clientId: number;
  facilityId: number;
  type:
    | "agreement"
    | "waiver"
    | "medical"
    | "vaccination"
    | "license"
    | "insurance"
    | "other";
  name: string;
  fileUrl: string;
  fileSize: number; // in bytes
  mimeType: string;
  uploadedBy: string;
  uploadedById: number;
  uploadedAt: string;
  expiryDate?: string;
  notes?: string;
  petId?: number; // Optional: if document is pet-specific
}

export const clientDocuments: ClientDocument[] = [
  {
    id: "doc-001",
    clientId: 15,
    facilityId: 11,
    type: "agreement",
    name: "Service Agreement - 2024",
    fileUrl: "/documents/agreements/alice-johnson-2024.pdf",
    fileSize: 245760,
    mimeType: "application/pdf",
    uploadedBy: "Sarah Johnson",
    uploadedById: 1,
    uploadedAt: "2024-01-15T10:00:00Z",
    notes: "Signed service agreement for daycare and boarding services.",
  },
  {
    id: "doc-002",
    clientId: 15,
    facilityId: 11,
    type: "vaccination",
    name: "Buddy - Rabies Vaccination Certificate",
    fileUrl: "/documents/vaccinations/buddy-rabies-2024.pdf",
    fileSize: 102400,
    mimeType: "application/pdf",
    uploadedBy: "Alice Johnson",
    uploadedById: 15,
    uploadedAt: "2024-01-20T14:30:00Z",
    expiryDate: "2025-01-20",
    petId: 1,
    notes: "Valid until January 2025",
  },
  {
    id: "doc-003",
    clientId: 15,
    facilityId: 11,
    type: "vaccination",
    name: "Whiskers - FVRCP Vaccination Record",
    fileUrl: "/documents/vaccinations/whiskers-fvrcp-2024.pdf",
    fileSize: 98304,
    mimeType: "application/pdf",
    uploadedBy: "Alice Johnson",
    uploadedById: 15,
    uploadedAt: "2024-02-01T11:00:00Z",
    expiryDate: "2025-02-01",
    petId: 2,
  },
  {
    id: "doc-004",
    clientId: 15,
    facilityId: 11,
    type: "waiver",
    name: "Liability Waiver - Daycare Services",
    fileUrl: "/documents/waivers/alice-johnson-waiver.pdf",
    fileSize: 153600,
    mimeType: "application/pdf",
    uploadedBy: "Sarah Johnson",
    uploadedById: 1,
    uploadedAt: "2024-01-15T10:05:00Z",
    notes: "General liability waiver for all services.",
  },
  {
    id: "doc-005",
    clientId: 16,
    facilityId: 11,
    type: "agreement",
    name: "Service Agreement - 2024",
    fileUrl: "/documents/agreements/bob-smith-2024.pdf",
    fileSize: 250000,
    mimeType: "application/pdf",
    uploadedBy: "Sarah Johnson",
    uploadedById: 1,
    uploadedAt: "2024-01-10T09:00:00Z",
  },
  {
    id: "doc-006",
    clientId: 16,
    facilityId: 11,
    type: "vaccination",
    name: "Max - Rabies & DHPP Vaccination",
    fileUrl: "/documents/vaccinations/max-vaccines-2024.pdf",
    fileSize: 112640,
    mimeType: "application/pdf",
    uploadedBy: "Bob Smith",
    uploadedById: 16,
    uploadedAt: "2024-01-12T16:00:00Z",
    expiryDate: "2025-01-12",
    petId: 3,
  },
  {
    id: "doc-007",
    clientId: 16,
    facilityId: 11,
    type: "medical",
    name: "Max - Hip Dysplasia Medical Report",
    fileUrl: "/documents/medical/max-hip-dysplasia.pdf",
    fileSize: 320000,
    mimeType: "application/pdf",
    uploadedBy: "Bob Smith",
    uploadedById: 16,
    uploadedAt: "2024-02-15T13:00:00Z",
    petId: 3,
    notes:
      "Veterinary report on hip dysplasia condition and care recommendations.",
  },
  {
    id: "doc-008",
    clientId: 29,
    facilityId: 11,
    type: "agreement",
    name: "Service Agreement - 2024",
    fileUrl: "/documents/agreements/jane-smith-2024.pdf",
    fileSize: 245000,
    mimeType: "application/pdf",
    uploadedBy: "Sarah Johnson",
    uploadedById: 1,
    uploadedAt: "2024-01-05T11:00:00Z",
  },
  {
    id: "doc-009",
    clientId: 29,
    facilityId: 11,
    type: "vaccination",
    name: "Fluffy - Complete Vaccination Record",
    fileUrl: "/documents/vaccinations/fluffy-vaccines-2024.pdf",
    fileSize: 145000,
    mimeType: "application/pdf",
    uploadedBy: "Jane Smith",
    uploadedById: 29,
    uploadedAt: "2024-01-08T10:00:00Z",
    expiryDate: "2025-01-08",
    petId: 14,
  },
  {
    id: "doc-010",
    clientId: 28,
    facilityId: 11,
    type: "agreement",
    name: "Service Agreement - 2024",
    fileUrl: "/documents/agreements/john-doe-2024.pdf",
    fileSize: 248000,
    mimeType: "application/pdf",
    uploadedBy: "Sarah Johnson",
    uploadedById: 1,
    uploadedAt: "2024-01-02T14:00:00Z",
  },
  {
    id: "doc-011",
    clientId: 28,
    facilityId: 11,
    type: "vaccination",
    name: "Rex - Vaccination Certificate 2024",
    fileUrl: "/documents/vaccinations/rex-vaccines-2024.pdf",
    fileSize: 95000,
    mimeType: "application/pdf",
    uploadedBy: "John Doe",
    uploadedById: 28,
    uploadedAt: "2024-01-03T09:30:00Z",
    expiryDate: "2025-01-03",
    petId: 13,
  },
];
