import { customerSegments, type CustomerSegment } from "@/data/marketing";

export const MARKETING_CUSTOM_SEGMENTS_STORAGE_KEY =
  "marketing-custom-customer-segments";
const MARKETING_CUSTOM_SEGMENTS_EVENT = "marketing-custom-segments-changed";

export interface CreateCustomCustomerSegmentInput {
  name: string;
  description: string;
  customerIds: Array<string | number>;
  sourceFilterSummary?: string;
}

function buildId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${random}`;
}

function emitSegmentsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(MARKETING_CUSTOM_SEGMENTS_EVENT));
}

function normalizeCustomerIds(ids: Array<string | number>): string[] {
  return Array.from(
    new Set(ids.map((id) => String(id).trim()).filter((id) => id.length > 0)),
  );
}

export function loadCustomCustomerSegmentsFromStorage(): CustomerSegment[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(
    MARKETING_CUSTOM_SEGMENTS_STORAGE_KEY,
  );
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (value): value is CustomerSegment =>
        !!value &&
        typeof value === "object" &&
        "id" in value &&
        "name" in value,
    );
  } catch {
    return [];
  }
}

export function getMarketingCustomerSegments(): CustomerSegment[] {
  return [...loadCustomCustomerSegmentsFromStorage(), ...customerSegments];
}

function saveCustomCustomerSegments(segments: CustomerSegment[]): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    MARKETING_CUSTOM_SEGMENTS_STORAGE_KEY,
    JSON.stringify(segments),
  );
  emitSegmentsChanged();
}

export function createCustomCustomerSegment(
  input: CreateCustomCustomerSegmentInput,
): CustomerSegment {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new Error("Segment name is required");
  }

  const normalizedCustomerIds = normalizeCustomerIds(input.customerIds);
  if (normalizedCustomerIds.length === 0) {
    throw new Error("At least one client is required to create a segment");
  }

  const now = new Date().toISOString();
  const descriptionParts = [
    input.description.trim() || "Created from customer selection.",
  ];

  if (input.sourceFilterSummary?.trim()) {
    descriptionParts.push(
      `Source filters: ${input.sourceFilterSummary.trim()}`,
    );
  }

  const newSegment: CustomerSegment = {
    id: buildId("seg-custom"),
    name: trimmedName,
    description: descriptionParts.join(" "),
    filterGroups: [
      {
        id: buildId("fg-custom"),
        filters: [
          {
            id: buildId("f-custom"),
            category: "compliance",
            field: "selected_client_ids",
            operator: "in",
            value: normalizedCustomerIds,
          },
        ],
      },
    ],
    groupLogicOperator: "AND",
    customerCount: normalizedCustomerIds.length,
    isFavorite: false,
    isBuiltIn: false,
    createdAt: now,
    updatedAt: now,
  };

  const currentCustomSegments = loadCustomCustomerSegmentsFromStorage();
  saveCustomCustomerSegments([newSegment, ...currentCustomSegments]);

  return newSegment;
}

export function subscribeToMarketingSegments(
  onSegmentsChanged: () => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const notify = () => onSegmentsChanged();
  window.addEventListener("storage", notify);
  window.addEventListener(
    MARKETING_CUSTOM_SEGMENTS_EVENT,
    notify as EventListener,
  );

  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(
      MARKETING_CUSTOM_SEGMENTS_EVENT,
      notify as EventListener,
    );
  };
}
