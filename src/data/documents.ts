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
  fileUrl?: string; // Optional for digital agreements
  fileSize?: number; // in bytes, optional for digital
  mimeType?: string; // Optional for digital agreements
  uploadedBy: string;
  uploadedById: number;
  uploadedAt: string;
  expiryDate?: string;
  notes?: string;
  petId?: number; // Optional: if document is pet-specific
  // Agreement-specific fields
  signatureType?: "physical" | "digital"; // physical = scanned upload, digital = agreed online
  signedAt?: string; // When the agreement was signed/accepted
  signedByName?: string; // Name of person who signed
  ipAddress?: string; // For digital signatures, the IP address
  agreedToTerms?: string[]; // List of terms/policies agreed to for digital
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
    signatureType: "physical",
    signedAt: "2024-01-15T09:45:00Z",
    signedByName: "Alice Johnson",
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
    uploadedBy: "Alice Johnson",
    uploadedById: 15,
    uploadedAt: "2024-01-15T10:05:00Z",
    notes: "Digitally agreed to liability waiver for all services.",
    signatureType: "digital",
    signedAt: "2024-01-15T10:05:00Z",
    signedByName: "Alice Johnson",
    ipAddress: "192.168.1.45",
    agreedToTerms: [
      "Liability Release",
      "Emergency Medical Authorization",
      "Photo/Video Release",
    ],
  },
  {
    id: "doc-005",
    clientId: 16,
    facilityId: 11,
    type: "agreement",
    name: "Service Agreement - 2024",
    uploadedBy: "Bob Smith",
    uploadedById: 16,
    uploadedAt: "2024-01-10T09:00:00Z",
    signatureType: "digital",
    signedAt: "2024-01-10T09:00:00Z",
    signedByName: "Bob Smith",
    ipAddress: "10.0.0.123",
    agreedToTerms: ["Terms of Service", "Cancellation Policy", "Payment Terms"],
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
    signatureType: "physical",
    signedAt: "2024-01-05T10:30:00Z",
    signedByName: "Jane Smith",
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
    signatureType: "physical",
    signedAt: "2024-01-02T13:45:00Z",
    signedByName: "John Doe",
  },
  {
    id: "doc-012",
    clientId: 28,
    facilityId: 11,
    type: "waiver",
    name: "Pet Care Waiver",
    uploadedBy: "John Doe",
    uploadedById: 28,
    uploadedAt: "2024-01-02T14:10:00Z",
    signatureType: "digital",
    signedAt: "2024-01-02T14:10:00Z",
    signedByName: "John Doe",
    ipAddress: "172.16.0.55",
    agreedToTerms: [
      "Liability Release",
      "Emergency Contact Authorization",
      "Medication Administration Consent",
    ],
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
