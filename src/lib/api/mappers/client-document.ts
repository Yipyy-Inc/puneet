// ============================================================================
// public.client_documents ⇄ what the client file's Documents tab reads.
// ============================================================================

export const CLIENT_DOCUMENT_TYPES = [
  "agreement",
  "waiver",
  "medical",
  "vaccination",
  "license",
  "insurance",
  "other",
] as const;

export type ClientDocumentType = (typeof CLIENT_DOCUMENT_TYPES)[number];

export const CLIENT_DOCUMENT_SELECT =
  "id, client_id, pet_id, doc_type, file_name, content_type, size_bytes, storage_path, notes, expires_on, uploaded_by_name, created_at, pets(ref, name)";

export interface ClientDocumentRow {
  id: string;
  client_id: string;
  pet_id: string | null;
  doc_type: ClientDocumentType;
  file_name: string;
  content_type: string;
  size_bytes: number;
  storage_path: string;
  notes: string | null;
  expires_on: string | null;
  uploaded_by_name: string | null;
  created_at: string;
  pets: { ref: number; name: string } | null;
}

export interface ClientDocumentFile {
  id: string;
  type: ClientDocumentType;
  name: string;
  contentType: string;
  sizeBytes: number;
  notes: string | null;
  expiresOn: string | null;
  petRef: number | null;
  petName: string | null;
  uploadedBy: string | null;
  uploadedAt: string;
  /** A signed link, good for a minute; null when signing failed. */
  fileUrl: string | null;
}

export function toClientDocument(
  row: ClientDocumentRow,
  fileUrl: string | null,
): ClientDocumentFile {
  return {
    id: row.id,
    type: row.doc_type,
    name: row.file_name,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    notes: row.notes,
    expiresOn: row.expires_on,
    petRef: row.pets?.ref ?? null,
    petName: row.pets?.name ?? null,
    uploadedBy: row.uploaded_by_name,
    uploadedAt: row.created_at,
    fileUrl,
  };
}
